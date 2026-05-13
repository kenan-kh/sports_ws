import express from 'express';

const app = express();
const port = 8000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express on port 8000!' });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

