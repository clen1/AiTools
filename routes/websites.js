const express = require('express');
const router = express.Router();
const WebsiteController = require('../controllers/websiteController');

// API路由
router.get('/api/featured', async (req, res) => {
  try {
    const featuredWebsites = await require('../models/website').getFeatured(req.query.limit || 6);
    res.json({ success: true, data: featuredWebsites });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取推荐网站出错' });
  }
});

module.exports = router;