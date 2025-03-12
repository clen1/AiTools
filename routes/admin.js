const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// 数据库连接
const db = global.db;

// 认证中间件
const isAuthenticated = (req, res, next) => {
  if (req.session.adminLoggedIn) {
    next();
  } else {
    res.redirect('/admin/login');
  }
};

// 为所有管理路由添加当前时间和用户信息
router.use((req, res, next) => {
  // 使用传入的固定时间：2025-03-08 01:45:25
  const now = new Date('2025-03-08T01:45:25Z');
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  res.locals.currentDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  res.locals.adminUsername = req.session.adminUsername || 'clen1';
  next();
});

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/uploads');
    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'website-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowedTypes.test(file.mimetype);
    if (ext && mimeType) {
      return cb(null, true);
    }
    cb(new Error('只支持以下文件类型: jpg, jpeg, png, gif, webp'));
  }
});

// 辅助函数：验证图片URL
async function isValidImageUrl(url) {
  try {
    if (!url || !url.match(/^https?:\/\//)) return false;
    
    const response = await axios.head(url, { 
      timeout: 5000,
      validateStatus: status => status < 400
    });
    
    const contentType = response.headers['content-type'] || '';
    return contentType.startsWith('image/');
  } catch (error) {
    console.error('URL验证错误:', error.message);
    return false;
  }
}

// 登录路由
router.get('/login', (req, res) => {
    res.render('admin/login', {
      title: '管理员登录',
      error: req.query.error || null,
      adminUsername: 'clen1',  // 登录页面默认显示的用户名
      isLoginPage: true  // 标记这是登录页面
    });
  });

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 从数据库获取管理员
    const [admins] = await db.query('SELECT * FROM admins WHERE username = ?', [username]);
    
    if (admins.length > 0) {
      const admin = admins[0];
      
      // 这里应该使用如bcrypt等库进行密码比较
      // 实际应用中应该比较哈希密码
      if (password === admin.password) { // 仅作演示，实际应使用加密比较
        // 设置会话
        req.session.adminLoggedIn = true;
        req.session.adminUsername = username;
        req.session.adminId = admin.id;
        
        res.redirect('/admin/dashboard');
      } else {
        res.render('admin/login', {
          title: '管理员登录',
          error: '密码不正确'
        });
      }
    } else {
      res.render('admin/login', {
        title: '管理员登录',
        error: '用户名不存在'
      });
    }
  } catch (error) {
    console.error('登录错误:', error);
    res.render('admin/login', {
      title: '管理员登录',
      error: '登录过程中出现错误'
    });
  }
});

// 退出登录
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// 仪表盘
router.get('/dashboard', isAuthenticated, async (req, res) => {
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
});

// 网站管理 - 列表
router.get('/websites', isAuthenticated, async (req, res) => {
  try {
    const [websites] = await db.query(`
      SELECT w.*, c.name as category_name 
      FROM websites w 
      LEFT JOIN categories c ON w.category_id = c.id
      ORDER BY w.id DESC
    `);
    
    res.render('admin/websites', {
      title: '网站管理',
      websites,
      message: req.query.message || null
    });
  } catch (error) {
    console.error('获取网站列表错误:', error);
    res.status(500).render('error', {
      title: '服务器错误',
      message: '获取网站列表出现错误'
    });
  }
});

// 网站管理 - 添加表单
router.get('/websites/new', isAuthenticated, async (req, res) => {
  try {
    // 获取所有分类用于表单选择
    const [categories] = await db.query('SELECT * FROM categories ORDER BY order_index ASC');
    
    res.render('admin/website-form', {
      title: '添加网站',
      website: null,
      categories,
      action: 'create'
    });
  } catch (error) {
    console.error('加载添加网站表单错误:', error);
    res.status(500).render('error', {
      title: '服务器错误',
      message: '加载表单时出现错误'
    });
  }
});

// 网站管理 - 创建处理
router.post('/websites/create', isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const { title, url, description, category_id, imgSourceOption } = req.body;
    const featured = req.body.featured ? 1 : 0;
    
    // 图片处理
    let image_url = null;
    
    // 处理图片来源选择
    if (imgSourceOption === 'url' && req.body.image_url) {
      // 使用URL链接
      const imageUrl = req.body.image_url.trim();
      
      // 简单验证URL是否有效 (可选择进行更严格的验证)
      if (!imageUrl.match(/^https?:\/\//)) {
        const [categories] = await db.query('SELECT * FROM categories ORDER BY order_index ASC');
        return res.render('admin/website-form', {
          title: '添加网站',
          website: req.body,
          categories,
          action: 'create',
          error: '请输入有效的图片URL (必须以http://或https://开头)'
        });
      }
      
      // 高级验证：检查URL是否指向图片文件 (可选)
      // const isValid = await isValidImageUrl(imageUrl);
      // if (!isValid) {
      //   const [categories] = await db.query('SELECT * FROM categories ORDER BY order_index ASC');
      //   return res.render('admin/website-form', {
      //     title: '添加网站',
      //     website: req.body,
      //     categories,
      //     action: 'create',
      //     error: 'URL不是有效的图片链接，请确认该URL指向图片文件'
      //   });
      // }
      
      image_url = imageUrl;
    } else if (req.file) {
      // 使用上传的文件
      image_url = `/uploads/${req.file.filename}`;
    }
    
    // 插入数据库
    const [result] = await db.query(
      'INSERT INTO websites (title, url, description, category_id, image_url, featured) VALUES (?, ?, ?, ?, ?, ?)',
      [title, url, description, category_id || null, image_url, featured]
    );
    
    res.redirect('/admin/websites?message=网站添加成功');
  } catch (error) {
    console.error('添加网站错误:', error);
    res.status(500).render('error', {
      title: '服务器错误',
      message: '添加网站时出现错误'
    });
  }
});

// 网站管理 - 编辑表单
router.get('/websites/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const id = req.params.id;
    
    // 获取网站信息
    const [websites] = await db.query('SELECT * FROM websites WHERE id = ?', [id]);
    
    if (websites.length === 0) {
      return res.status(404).render('error', {
        title: '404 未找到',
        message: '未找到请求的网站'
      });
    }
    
    // 获取所有分类用于表单选择
    const [categories] = await db.query('SELECT * FROM categories ORDER BY order_index ASC');
    
    res.render('admin/website-form', {
      title: '编辑网站',
      website: websites[0],
      categories,
      action: 'edit'
    });
  } catch (error) {
    console.error('加载编辑网站表单错误:', error);
    res.status(500).render('error', {
      title: '服务器错误',
      message: '加载表单时出现错误'
    });
  }
});

// 网站管理 - 更新处理
router.post('/websites/update/:id', isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const id = req.params.id;
    const { title, url, description, category_id, imgSourceOption } = req.body;
    const featured = req.body.featured ? 1 : 0;
    
    // 获取当前网站信息
    const [websites] = await db.query('SELECT * FROM websites WHERE id = ?', [id]);
    
    if (websites.length === 0) {
      return res.status(404).render('error', {
        title: '404 未找到',
        message: '未找到请求的网站'
      });
    }
    
    const currentWebsite = websites[0];
    
    // 图片处理
    let image_url = currentWebsite.image_url;
    
    // 处理图片来源选择
    if (imgSourceOption === 'url') {
      // 使用URL链接
      if (req.body.image_url && req.body.image_url.trim() !== '') {
        const imageUrl = req.body.image_url.trim();
        
        // 简单验证URL是否有效
        if (!imageUrl.match(/^https?:\/\//)) {
          const [categories] = await db.query('SELECT * FROM categories ORDER BY order_index ASC');
          return res.render('admin/website-form', {
            title: '编辑网站',
            website: {...currentWebsite, ...req.body},
            categories,
            action: 'edit',
            error: '请输入有效的图片URL (必须以http://或https://开头)'
          });
        }
        
        // 如果之前是上传的文件，现在改为URL，则删除旧文件
        if (currentWebsite.image_url && !currentWebsite.image_url.startsWith('http')) {
          const oldImagePath = path.join(__dirname, '../public', currentWebsite.image_url);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        
        image_url = imageUrl;
      }
    } else if (req.file) {
      // 使用上传的新文件
      // 删除旧图片文件
      if (currentWebsite.image_url && !currentWebsite.image_url.startsWith('http')) {
        const oldImagePath = path.join(__dirname, '../public', currentWebsite.image_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      image_url = `/uploads/${req.file.filename}`;
    }
    // 如果没有新上传的文件也没提供URL，并且选择了上传选项，则保留原来的图片
    
    // 更新数据库
    await db.query(
      'UPDATE websites SET title = ?, url = ?, description = ?, category_id = ?, image_url = ?, featured = ? WHERE id = ?',
      [title, url, description, category_id || null, image_url, featured, id]
    );
    
    res.redirect('/admin/websites?message=网站更新成功');
  } catch (error) {
    console.error('更新网站错误:', error);
    res.status(500).render('error', {
      title: '服务器错误',
      message: '更新网站时出现错误'
    });
  }
});

// 网站管理 - 删除处理
router.delete('/websites/delete/:id', isAuthenticated, async (req, res) => {
  try {
    const id = req.params.id;
    
    // 获取当前网站信息
    const [websites] = await db.query('SELECT * FROM websites WHERE id = ?', [id]);
    
    if (websites.length > 0) {
      const website = websites[0];
      
      // 如果有图片，删除图片文件
      if (website.image_url && !website.image_url.startsWith('http')) {
        const imagePath = path.join(__dirname, '../public', website.image_url);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
      
      // 从数据库删除
      await db.query('DELETE FROM websites WHERE id = ?', [id]);
      
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: '网站不存在' });
    }
  } catch (error) {
    console.error('删除网站错误:', error);
    res.status(500).json({ success: false, message: '删除网站时出现错误' });
  }
});

// 分类管理 - 列表
router.get('/categories', isAuthenticated, async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM categories ORDER BY order_index ASC');
    
    res.render('admin/categories', {
      title: '分类管理',
      categories,
      message: req.query.message || null
    });
  } catch (error) {
    console.error('获取分类列表错误:', error);
    res.status(500).render('error', {
      title: '服务器错误',
      message: '获取分类列表出现错误'
    });
  }
});

// 分类管理 - 添加表单
router.get('/categories/new', isAuthenticated, (req, res) => {
  res.render('admin/category-form', {
    title: '创建分类',
    category: null,
    action: 'create'
  });
});

// 分类管理 - 创建处理
router.post('/categories/create', isAuthenticated, async (req, res) => {
  try {
    const { name, description, icon, order_index } = req.body;
    
    // 插入数据库
    const [result] = await db.query(
      'INSERT INTO categories (name, description, icon, order_index) VALUES (?, ?, ?, ?)',
      [name, description, icon, order_index || 0]
    );
    
    res.redirect('/admin/categories?message=分类添加成功');
  } catch (error) {
    console.error('添加分类错误:', error);
    res.status(500).render('error', {
      title: '服务器错误',
      message: '添加分类时出现错误'
    });
  }
});

// 分类管理 - 编辑表单
router.get('/categories/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const id = req.params.id;
    
    // 获取分类信息
    const [categories] = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
    
    if (categories.length === 0) {
      return res.status(404).render('error', {
        title: '404 未找到',
        message: '未找到请求的分类'
      });
    }
    
    res.render('admin/category-form', {
      title: '编辑分类',
      category: categories[0],
      action: 'edit'
    });
  } catch (error) {
    console.error('加载编辑分类表单错误:', error);
    res.status(500).render('error', {
      title: '服务器错误',
      message: '加载表单时出现错误'
    });
  }
});

// 分类管理 - 更新处理
router.post('/categories/update/:id', isAuthenticated, async (req, res) => {
  try {
    const id = req.params.id;
    const { name, description, icon, order_index } = req.body;
    
    // 更新数据库
    await db.query(
      'UPDATE categories SET name = ?, description = ?, icon = ?, order_index = ? WHERE id = ?',
      [name, description, icon, order_index || 0, id]
    );
    
    res.redirect('/admin/categories?message=分类更新成功');
  } catch (error) {
    console.error('更新分类错误:', error);
    res.status(500).render('error', {
      title: '服务器错误',
      message: '更新分类时出现错误'
    });
  }
});

// 分类管理 - 删除处理
router.delete('/categories/delete/:id', isAuthenticated, async (req, res) => {
  try {
    const id = req.params.id;
    
    // 检查是否有网站使用此分类
    const [websites] = await db.query('SELECT COUNT(*) as count FROM websites WHERE category_id = ?', [id]);
    const websitesCount = websites[0].count;
    
    // 如果有网站使用此分类，将它们变为未分类
    if (websitesCount > 0) {
      await db.query('UPDATE websites SET category_id = NULL WHERE category_id = ?', [id]);
    }
    
    // 从数据库删除分类
    await db.query('DELETE FROM categories WHERE id = ?', [id]);
    
    res.json({ 
      success: true, 
      message: websitesCount > 0 ? `已删除分类，并将${websitesCount}个网站设为未分类` : '分类删除成功' 
    });
  } catch (error) {
    console.error('删除分类错误:', error);
    res.status(500).json({ success: false, message: '删除分类时出现错误' });
  }
});

// 验证图片URL API端点
router.post('/validate-image-url', isAuthenticated, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url || !url.trim()) {
      return res.json({ valid: false, message: 'URL不能为空' });
    }
    
    const imageUrl = url.trim();
    
    // 简单验证是否是URL格式
    if (!imageUrl.match(/^https?:\/\//)) {
      return res.json({ valid: false, message: 'URL必须以http://或https://开头' });
    }
    
    // 验证是否是图片URL
    try {
      const response = await axios.head(imageUrl, { 
        timeout: 5000,
        validateStatus: status => status < 400
      });
      
      const contentType = response.headers['content-type'] || '';
      const isImage = contentType.startsWith('image/');
      
      return res.json({ 
        valid: isImage, 
        message: isImage ? '图片URL有效' : '提供的URL不是图片' 
      });
    } catch (error) {
      return res.json({ valid: false, message: '无法访问此URL或URL无效' });
    }
  } catch (error) {
    console.error('验证图片URL错误:', error);
    res.status(500).json({ valid: false, message: '验证过程中出现错误' });
  }
});

// 时间与用户信息API - 用于前端动态更新
router.get('/info', isAuthenticated, (req, res) => {
  // 使用当前日期和时间：2025-03-08 01:49:34
  const now = new Date('2025-03-08T01:49:34Z');
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const currentDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  
  res.json({
    currentDateTime: currentDateTime,
    username: req.session.adminUsername || 'clen1',
    success: true
  });
});

module.exports = router;