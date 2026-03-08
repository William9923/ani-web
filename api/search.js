// Vercel serverless function — GET /api/search?q=...&mode=sub
const { search } = require('./_lib')

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { q = '', mode = 'sub' } = req.query
  try {
    const results = await search(q, mode)
    res.status(200).json(results)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
