require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(require('child_process').exec);
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const app = express();

// Load environment variables
const pythonPath = process.env.PYTHON_PATH;
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test the database connection
pool.connect((err) => {
  if (err) {
    console.error('Error connecting to PostgreSQL database:', err);
    process.exit(1);
  }
  console.log('Connected to PostgreSQL database');
});

// Test route
app.get('/', (req, res) => {
  res.send('Backend server is running');
});

// Route to save signal file and run backtest
app.post('/api/signal-files', async (req, res) => {
  const { filename, content } = req.body;

  try {
    // Save the signal file to the database
    const result = await pool.query(
      'INSERT INTO signal_files (filename, content) VALUES ($1, $2) RETURNING *',
      [filename, content]
    );
    const signalFile = result.rows[0];

    // Write the signal file content to a temporary file
    const tempFilePath = path.join(__dirname, 'scripts', `temp_${signalFile.id}.csv`);
    fs.writeFileSync(tempFilePath, signalFile.content);

    // Run the backtest.py script using the virtual environment's Python
    const command = `${pythonPath} ${path.join(__dirname, 'scripts', 'backtest.py')} ${tempFilePath}`;
    const { stdout, stderr } = await execPromise(command);

    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);

    if (stderr) {
      console.error('backtest.py stderr:', stderr);
    }

    try {
      const metrics = JSON.parse(stdout);
      console.log('Debug: Metrics from backtest.py:', metrics); // Debug log
      if (metrics.error) {
        return res.status(500).json({ error: metrics.error });
      }

      // Save the backtest results to the database, including beta
      const result = await pool.query(
        'INSERT INTO backtest_results (signal_file_id, filename, win_rate, risk_reward_ratio, max_losing_streak, sharpe_ratio, std_dev, skewness, beta) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
        [
          signalFile.id,
          filename,
          metrics.win_rate,
          metrics.risk_reward_ratio,
          metrics.max_losing_streak,
          metrics.sharpe_ratio,
          metrics.std_dev,
          metrics.skewness,
          metrics.beta || 0, // Default to 0 if beta is undefined
        ]
      );
      console.log('Debug: Saved backtest result:', result.rows[0]); // Debug log
      res.status(201).json(result.rows[0]);
    } catch (parseError) {
      console.error('Error parsing backtest.py output:', parseError);
      console.error('backtest.py stdout:', stdout);
      res.status(500).json({ error: 'Failed to parse backtest results' });
    }
  } catch (error) {
    console.error('Error saving signal file:', error);
    res.status(500).json({ error: 'Failed to save signal file' });
  }
});

// Route to fetch all backtest results
app.get('/api/backtest-results', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM backtest_results');
    console.log('Debug: Fetched backtest results:', result.rows); // Debug log
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching backtest results:', error);
    res.status(500).json({ error: 'Failed to fetch backtest results' });
  }
});

// Route to fetch company-specific metrics for a signal file
app.get('/api/signal-files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT content FROM signal_files WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Signal file not found' });
    }

    const signalContent = rows[0].content;
    const tempFilePath = `/tmp/signal_file_${id}.csv`;
    console.log('Signal file content:', signalContent);
    // Ensure proper newline handling
    fs.writeFileSync(tempFilePath, signalContent, { encoding: 'utf8', flag: 'w' });

    const scriptPath = path.join(__dirname, 'scripts', 'company_metrics.py');
    const command = `${pythonPath} ${scriptPath} ${tempFilePath}`;
    console.log('Executing command:', command);
    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.error('Python script stderr:', stderr);
    }

    let metrics;
    try {
      metrics = JSON.parse(stdout);
    } catch (parseError) {
      console.error('Failed to parse Python script output:', stdout);
      console.error('Parsing error details:', parseError.message);
      throw new Error('Failed to parse company metrics');
    }

    if (metrics.error) {
      throw new Error(metrics.error);
    }

    res.json(metrics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to parse company metrics' });
  }
});

// New endpoint for stock analysis
app.post('/api/analyze', async (req, res) => {
  try {
    const { symbol, period } = req.body;
    if (!symbol || !period) {
      return res.status(400).json({ error: 'Symbol and period are required' });
    }

    // Construct the command to run analyze_stock.py using the virtual environment's Python
    const scriptPath = path.join(__dirname, 'scripts', 'analyze_stock.py');
    const command = `${pythonPath} ${scriptPath} ${symbol} ${period}`;
    console.log('Executing command:', command);

    // Execute the Python script
    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.error('Python script stderr:', stderr);
    }

    // Log the raw stdout for debugging
    console.log('Raw Python script output:', stdout);

    // Parse the output from the Python script
    let result;
    try {
      result = JSON.parse(stdout);
    } catch (parseError) {
      console.error('Failed to parse Python script output:', stdout);
      console.error('Parsing error details:', parseError.message);
      return res.status(500).json({ error: 'Failed to parse analysis results', details: parseError.message });
    }

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error running stock analysis:', error);
    res.status(500).json({ error: 'Failed to run stock analysis', details: error.message });
  }
});

// New endpoint for generating signals (for GenerateSignals.jsx)
app.post('/api/screener/generate-signals', upload.fields([
  { name: 'entryFile', maxCount: 1 },
  { name: 'exitFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const entryFilePath = req.files['entryFile'][0].path;
    const exitFilePath = req.files['exitFile'][0].path;

    const command = `${pythonPath} ${path.join(__dirname, 'scripts', 'generate_signals.py')} ${entryFilePath} ${exitFilePath}`;
    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.error('Python script stderr:', stderr);
    }

    const result = JSON.parse(stdout);
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    // Clean up uploaded files
    fs.unlinkSync(entryFilePath);
    fs.unlinkSync(exitFilePath);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error generating signals:', error);
    res.status(500).json({ error: 'Failed to generate signals' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});