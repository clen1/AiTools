
const express = require('express');
const router = express.Router();
const WebsiteController = require('../controllers/websiteController');

// 前端页面路由
router.get('/', WebsiteController.showAllWebsites);
router.get('/category/:id', WebsiteController.showWebsitesByCategory);
router.get('/website/:id', WebsiteController.showWebsiteDetail);
router.get('/search', WebsiteController.searchWebsites);

module.exports = router;