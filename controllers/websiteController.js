
const Website = require('../models/website');
const Category = require('../models/category');
const path = require('path');
const fs = require('fs');

const WebsiteController = {
  // 前端：显示所有网站
  showAllWebsites: async (req, res) => {
    try {
      const websites = await Website.getAll();
      const categories = await Category.getAll();
      const featuredWebsites = await Website.getFeatured();
      
      res.render('index', {
        title: 'AI 网站收集',
        websites,
        categories,
        featuredWebsites,
        activeCategory: null
      });
    } catch (error) {
      console.error('获取网站列表错误:', error);
      res.status(500).render('error', {
        title: '服务器错误',
        message: '获取网站列表出现错误'
      });
    }
  },
  
  // 前端：按分类显示网站
  showWebsitesByCategory: async (req, res) => {
    try {
      const categoryId = req.params.id;
      const category = await Category.getById(categoryId);
      
      if (!category) {
        return res.status(404).render('error', {
          title: '404 未找到',
          message: '未找到请求的分类'
        });
      }
      
      const websites = await Website.getByCategoryId(categoryId);
      const categories = await Category.getAll();
      const featuredWebsites = await Website.getFeatured();
      
      res.render('index', {
        title: `${category.name} - AI 网站收集`,
        websites,
        categories,
        featuredWebsites,
        activeCategory: parseInt(categoryId)
      });
    } catch (error) {
      console.error('获取分类网站错误:', error);
      res.status(500).render('error', {
        title: '服务器错误',
        message: '获取分类网站列表出现错误'
      });
    }
  },
  
  // 前端：显示网站详情
  showWebsiteDetail: async (req, res) => {
    try {
      const id = req.params.id;
      const website = await Website.getById(id);
      
      if (!website) {
        return res.status(404).render('error', {
          title: '404 未找到',
          message: '未找到请求的网站'
        });
      }
      
      // 更新访问计数
      await Website.incrementVisitCount(id);
      
      // 获取相关网站(同类别)
      const relatedWebsites = website.category_id ? 
        (await Website.getByCategoryId(website.category_id)).filter(w => w.id !== website.id).slice(0, 4) : [];
      
      const categories = await Category.getAll();
      
      res.render('detail', {
        title: `${website.title} - AI 网站收集`,
        website,
        categories,
        relatedWebsites,
        activeCategory: website.category_id
      });
    } catch (error) {
      console.error('获取网站详情错误:', error);
      res.status(500).render('error', {
        title: '服务器错误',
        message: '获取网站详情出现错误'
      });
    }
  },
  
  // 前端：搜索网站
  searchWebsites: async (req, res) => {
    try {
      const searchTerm = req.query.q || '';
      let websites = [];
      
      if (searchTerm.trim()) {
        websites = await Website.search(searchTerm);
      }
      
      const categories = await Category.getAll();
      
      res.render('search-results', {
        title: `搜索: ${searchTerm} - AI 网站收集`,
        websites,
        categories,
        searchTerm,
        activeCategory: null
      });
    } catch (error) {
      console.error('搜索网站错误:', error);
      res.status(500).render('error', {
        title: '服务器错误',
        message: '搜索网站时出现错误'
      });
    }
  },
  
  // 后台：获取所有网站
  adminGetAllWebsites: async (req, res) => {
    try {
      const websites = await Website.getAll();
      
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
  },
  
  // 后台：显示创建网站表单
  showCreateForm: async (req, res) => {
    try {
      const categories = await Category.getAll();
      
      res.render('admin/website-form', {
        title: '添加网站',
        website: null,
        categories,
        action: 'create'
      });
    } catch (error) {
      console.error('显示创建网站表单错误:', error);
      res.status(500).render('error', {
        title: '服务器错误',
        message: '获取创建网站表单数据时出现错误'
      });
    }
  },
  
  // 后台：创建网站
  createWebsite: async (req, res) => {
    try {
      const { title, description, url, category_id } = req.body;
      const featured = req.body.featured === 'on';
      
      // 处理上传的图片
      let image_url = '';
      if (req.file) {
        image_url = `/uploads/${req.file.filename}`;
      }
      
      await Website.create({
        title,
        description,
        url,
        image_url,
        category_id: category_id || null,
        featured
      });
      
      res.redirect('/admin/websites?message=网站创建成功');
    } catch (error) {
      console.error('创建网站错误:', error);
      res.status(500).render('error', {
        title: '服务器错误',
        message: '创建网站时出现错误'
      });
    }
  },
  
  // 后台：显示编辑网站表单
  showEditForm: async (req, res) => {
    try {
      const id = req.params.id;
      const website = await Website.getById(id);
      
      if (!website) {
        return res.status(404).render('error', {
          title: '404 未找到',
          message: '未找到请求的网站'
        });
      }
      
      const categories = await Category.getAll();
      
      res.render('admin/website-form', {
        title: '编辑网站',
        website,
        categories,
        action: 'edit'
      });
    } catch (error) {
      console.error('显示编辑网站表单错误:', error);
      res.status(500).render('error', {
        title: '服务器错误',
        message: '获取编辑网站表单数据时出现错误'
      });
    }
  },
  
  // 后台：更新网站
  updateWebsite: async (req, res) => {
    try {
      const id = req.params.id;
      const { title, description, url, category_id } = req.body;
      const featured = req.body.featured === 'on';
      
      // 获取当前网站信息
      const currentWebsite = await Website.getById(id);
      
      if (!currentWebsite) {
        return res.status(404).render('error', {
          title: '404 未找到',
          message: '未找到请求的网站'
        });
      }
      
      // 处理上传的图片
      let image_url = currentWebsite.image_url;
      if (req.file) {
        // 如果有新图片上传，删除旧的
        if (currentWebsite.image_url) {
          const oldImagePath = path.join(__dirname, '../public', currentWebsite.image_url);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        image_url = `/uploads/${req.file.filename}`;
      }
      
      const success = await Website.update(id, {
        title,
        description,
        url,
        image_url,
        category_id: category_id || null,
        featured
      });
      
      if (!success) {
        return res.status(404).render('error', {
          title: '404 未找到',
          message: '未找到请求的网站'
        });
      }
      
      res.redirect('/admin/websites?message=网站更新成功');
    } catch (error) {
      console.error('更新网站错误:', error);
      res.status(500).render('error', {
        title: '服务器错误',
        message: '更新网站时出现错误'
      });
    }
  },
  
  // 后台：删除网站
  deleteWebsite: async (req, res) => {
    try {
      const id = req.params.id;
      const website = await Website.getById(id);
      
      if (!website) {
        return res.status(404).json({
          success: false,
          message: '未找到请求的网站'
        });
      }
      
      // 删除关联的图片
      if (website.image_url) {
        const imagePath = path.join(__dirname, '../public', website.image_url);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
      
      const success = await Website.delete(id);
      
      res.json({
        success: true,
        message: '网站删除成功'
      });
    } catch (error) {
      console.error('删除网站错误:', error);
      res.status(500).json({
        success: false,
        message: '删除网站时出现错误'
      });
    }
  }
};

module.exports = WebsiteController;