module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    res.status(200).json({ 
      ANILIST_CLIENT_ID: process.env.ANILIST_CLIENT_ID || ''
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
