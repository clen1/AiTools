const bcrypt = require('bcrypt');
const db = require('../models/database');

const AdminController = {
  // 显示登录页面
  showLoginPage: (req, res) => {
    if (req.session.adminLoggedIn) {
      return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', { title: '管理员登录', error: null });
  },
  
  // 处理登录请求
  login: async (req, res) => {
    const { username, password } = req.body;
    
    try {
      const [rows] = await db.query('SELECT * FROM admins WHERE username = ?', [username]);
      
      if (rows.length === 0) {
        return res.render('admin/login', { 
          title: '管理员登录', 
          error: '用户名或密码不正确' 
        });
      }
      
      const admin = rows[0];
      // 在实际应用中使用bcrypt比较
      // const match = await bcrypt.compare(password, admin.password);
      
      // 简化处理，实际应用中应使用哈希比较
      const match = password === admin.password;
      
      if (!match) {
        return res.render('admin/login', { 
          title: '管理员登录', 
          error: '用户名或密码不正确' 
        });
      }
      
      // 更新最后登录时间
      await db.query('UPDATE admins SET last_login = NOW() WHERE id = ?', [admin.id]);
      
      // 设置session
      req.session.adminLoggedIn = true;
      req.session.adminId = admin.id;
      req.session.adminUsername = admin.username;
      
      res.redirect('/admin/dashboard');
    } catch (error) {
      console.error('登录错误:', error);
      res.render('admin/login', { 
        title: '管理员登录', 
        error: '登录过程中出现错误，请稍后再试' 
      });
    }
  },
  
  // 退出登录
  logout: (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
  },
  
  // 显示管理员仪表盘
  showDashboard: async (req, res) => {
    try {
      // 获取统计信息
      const [websitesCount] = await db.query('SELECT COUNT(*) as count FROM websites');
      const [categoriesCount] = await db.query('SELECT COUNT(*) as count FROM categories');
      const [popularWebsites] = await db.query(`
        SELECT w.*, c.name as category_name 
        FROM websites w 
        LEFT JOIN categories c ON w.category_id = c.id 
        ORDER BY w.visit_count DESC 
        LIMIT 5
      `);
      
      res.render('admin/dashboard', {
        title: '管理员控制台',
        admin: req.session.adminUsername,
        stats: {
          websites: websitesCount[0].count,
          categories: categoriesCount[0].count
        },
        popularWebsites
      });
    } catch (error) {
      console.error('获取仪表盘数据错误:', error);
      res.status(500).render('error', {
        title: '服务器错误',
        message: '获取仪表盘数据时出现错误'
      });
    }
  }
};

module.exports = AdminController;