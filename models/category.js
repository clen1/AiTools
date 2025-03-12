const db = require('./database');

const Category = {
  // 获取所有分类
  getAll: async () => {
    const [rows] = await db.query('SELECT * FROM categories ORDER BY order_index ASC');
    return rows;
  },
  
  // 获取单个分类
  getById: async (id) => {
    const [rows] = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
    return rows[0];
  },
  
  // 创建分类
  create: async (category) => {
    const { name, description, icon, order_index } = category;
    const [result] = await db.query(
      'INSERT INTO categories (name, description, icon, order_index) VALUES (?, ?, ?, ?)',
      [name, description, icon, order_index]
    );
    return result.insertId;
  },
  
  // 更新分类
  update: async (id, category) => {
    const { name, description, icon, order_index } = category;
    const [result] = await db.query(
      'UPDATE categories SET name = ?, description = ?, icon = ?, order_index = ? WHERE id = ?',
      [name, description, icon, order_index, id]
    );
    return result.affectedRows > 0;
  },
  
  // 删除分类
  delete: async (id) => {
    const [result] = await db.query('DELETE FROM categories WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};

module.exports = Category;