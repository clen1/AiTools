document.addEventListener('DOMContentLoaded', function() {
    // 侧边栏切换功能
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
    
    // 手机视图下的侧边栏切换
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', function() {
        sidebar.classList.remove('active');
      });
    }
    
    // 桌面视图下的侧边栏切换
    if (mobileSidebarToggle) {
      mobileSidebarToggle.addEventListener('click', function() {
        sidebar.classList.add('active');
      });
    }
    
    // 响应式处理
    function checkScreenSize() {
      if (window.innerWidth < 768) {
        sidebar.classList.remove('active');
      } else {
        sidebar.classList.add('active');
      }
    }
    
    // 初始检查
    checkScreenSize();
    
    // 窗口大小变化时检查
    window.addEventListener('resize', checkScreenSize);
  });