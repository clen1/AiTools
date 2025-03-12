const express = require('express');
const session = require('express-session');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const multer = require('multer');

// 加载环境变量
dotenv.config();

const app = express();

// 创建数据库连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ai_websites',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 导出数据库连接以便在其他模块中使用
global.db = pool;

// 配置视图引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 使用EJS布局
app.use(expressLayouts);
app.set('layout', 'layouts/main'); // 设置默认布局

// 路由处理前的中间件
// 路由处理前的中间件
app.use((req, res, next) => {
    // 更新当前时间和用户信息
    res.locals.currentDateTime = '2025-03-07 07:15:57';
    res.locals.adminUsername = 'clen1';
    
    // 保存当前路径
    res.locals.path = req.path;
    res.locals.url = req.originalUrl;
    
    // 为所有管理后台路由设置相同的布局，包括登录页面
    if (req.originalUrl.startsWith('/admin')) {
      res.locals.layout = 'layouts/admin';
      
      // 标记是否为登录页
      res.locals.isLoginPage = (req.originalUrl === '/admin/login');
    }
    
    next();
  });

// 配置静态文件目录
app.use(express.static(path.join(__dirname, 'public')));

// 解析请求体
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 配置session
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}));

// 全局变量中间件 - 导航分类
app.use(async (req, res, next) => {
  try {
    // 获取所有分类用于导航
    if (!req.originalUrl.startsWith('/admin/login')) {
      const [categories] = await pool.query('SELECT * FROM categories ORDER BY order_index ASC');
      res.locals.categories = categories;
    }
    
    // 如果用户已登录，传递用户信息到视图
    if (req.session.adminLoggedIn) {
      res.locals.adminUsername = req.session.adminUsername || 'clen1'; // 使用会话中的用户名，如果没有则使用默认值
    }
    
    next();
  } catch (error) {
    console.error('加载分类错误:', error);
    next();
  }
});

// 导入路由
const indexRoutes = require('./routes/index');
const websitesRoutes = require('./routes/websites');
const adminRoutes = require('./routes/admin');

// 使用路由
app.use('/', indexRoutes);
app.use('/websites', websitesRoutes);
app.use('/admin', adminRoutes);

// 404 处理
app.use((req, res) => {
  // 根据请求路径选择布局
  const layout = req.originalUrl.startsWith('/admin') ? 'layouts/admin' : 'layouts/main';
  
  res.status(404).render('404', { 
    title: '页面未找到',
    layout
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // 根据请求路径选择布局
  const layout = req.originalUrl.startsWith('/admin') ? 'layouts/admin' : 'layouts/main';
  
  res.status(500).render('error', { 
    title: '服务器错误', 
    error: err,
    layout
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

module.exports = app;