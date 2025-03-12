
const Category = require('../models/category');

const CategoryController = {
  // 获取所有分类
  getAllCategories: async (req, res) => {
    try {
      const categories = await Category.getAll();
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
  },
  
  // 显示创建分类表单
  showCreateForm: (req, res) => {
    res.render('admin/category-form', {
      title: '创建分类',
      category: null,
      action: 'create'
    });
  },
  
  // 创建分类
  createCategory: async (req, res) => {
    try {
      const { name, description, icon, order_index } = req.body;
      await Category.create({ name, description, icon, order_index });
      res.redirect('/admin/categories?message=分类创建成功');
    } catch (error) {
      console.error('创建分类错误:', error);
      res.status(500).render('error', {
        title: '服务器错误',
        message: '创建分类时出现错误'
      });
    }
  },
  
  // 显示编辑分类表单
  showEditForm: async (req, res) => {
    try {
      const id = req.params.id;
      const category = await Category.getById(id);
      
      if (!category) {
        return res.status(404).render('error', {
          title: '404 未找到',
          message: '未找到请求的分类'
        });
      }
      
      res.render('admin/category-form', {
        title: '编辑分类',
        category,
        action: 'edit'
      });
    } catch (error) {
      console.error('获取分类详情错误:', error);
      res.status(500).render('error', {
        title: '服务器错误',
        message: '获取分类详情时出现错误'
      });
    }
  },
  
  // 更新分类
  updateCategory: async (req, res) => {
    try {
      const id = req.params.id;
      const { name, description, icon, order_index } = req.body;
      
      const success = await Category.update(id, {
        name, description, icon, order_index
      });
      
      if (!success) {
        return res.status(404).render('error', {
          title: '404 未找到',
          message: '未找到请求的分类'
        });
      }
      
      res.redirect('/admin/categories?message=分类更新成功');
    } catch (error) {
      console.error('更新分类错误:', error);
      res.status(500).render('error', {
        title: '服务器错误',
        message: '更新分类时出现错误'
      });
    }
  },
  
  // 删除分类
  deleteCategory: async (req, res) => {
    try {
      const id = req.params.id;
      const success = await Category.delete(id);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: '未找到请求的分类'
        });
      }
      
      res.json({
        success: true,
        message: '分类删除成功'
      });
    } catch (error) {
      console.error('删除分类错误:', error);
      res.status(500).json({
        success: false,
        message: '删除分类时出现错误'
      });
    }
  }
};

module.exports = CategoryController;