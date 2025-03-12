const db = require('./database');

const Website = {
  // 获取所有网站
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT w.*, c.name as category_name 
      FROM websites w 
      LEFT JOIN categories c ON w.category_id = c.id 
      ORDER BY w.created_at DESC
    `);
    return rows;
  },
  
  // 根据分类ID获取网站
  getByCategoryId: async (categoryId) => {
    const [rows] = await db.query(`
      SELECT w.*, c.name as category_name 
      FROM websites w 
      LEFT JOIN categories c ON w.category_id = c.id 
      WHERE w.category_id = ? 
      ORDER BY w.created_at DESC
    `, [categoryId]);
    return rows;
  },
  
  // 获取单个网站
  getById: async (id) => {
    const [rows] = await db.query(`
      SELECT w.*, c.name as category_name 
      FROM websites w 
      LEFT JOIN categories c ON w.category_id = c.id 
      WHERE w.id = ?
    `, [id]);
    return rows[0];
  },
  
  // 创建网站
  create: async (website) => {
    const { title, description, url, image_url, category_id, featured } = website;
    const [result] = await db.query(
      'INSERT INTO websites (title, description, url, image_url, category_id, featured) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, url, image_url, category_id, featured || false]
    );
    return result.insertId;
  },
  
  // 更新网站
  update: async (id, website) => {
    const { title, description, url, image_url, category_id, featured } = website;
    const [result] = await db.query(
      'UPDATE websites SET title = ?, description = ?, url = ?, image_url = ?, category_id = ?, featured = ? WHERE id = ?',
      [title, description, url, image_url, category_id, featured || false, id]
    );
    return result.affectedRows > 0;
  },
  
  // 删除网站
  delete: async (id) => {
    const [result] = await db.query('DELETE FROM websites WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },
  
  // 增加访问计数
  incrementVisitCount: async (id) => {
    await db.query('UPDATE websites SET visit_count = visit_count + 1 WHERE id = ?', [id]);
  },
  
  // 获取推荐网站
  getFeatured: async (limit = 6) => {
    const [rows] = await db.query(`
      SELECT w.*, c.name as category_name 
      FROM websites w 
      LEFT JOIN categories c ON w.category_id = c.id 
      WHERE w.featured = 1 
      ORDER BY w.visit_count DESC 
      LIMIT ?
    `, [limit]);
    return rows;
  },
  
  // 搜索网站
  search: async (term) => {
    const searchTerm = `%${term}%`;
    const [rows] = await db.query(`
      SELECT w.*, c.name as category_name 
      FROM websites w 
      LEFT JOIN categories c ON w.category_id = c.id 
      WHERE w.title LIKE ? OR w.description LIKE ? 
      ORDER BY w.title ASC
    `, [searchTerm, searchTerm]);
    return rows;
  }
};

module.exports = Website;