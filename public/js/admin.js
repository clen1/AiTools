document.addEventListener('DOMContentLoaded', function() {
    // 侧边栏切换功能
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    
    if (sidebarCollapse) {
      sidebarCollapse.addEventListener('click', function() {
        sidebar.classList.toggle('active');
        content.classList.toggle('active');
      });
    }
    
    // 自动消失的提示框
    const alertElement = document.querySelector('.alert-success');
    if (alertElement) {
      setTimeout(function() {
        const bsAlert = new bootstrap.Alert(alertElement);
        bsAlert.close();
      }, 5000);
    }
  });