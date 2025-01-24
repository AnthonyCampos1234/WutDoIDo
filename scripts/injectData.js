window.wutdoido = {};

window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'WUTDOIDO_SET_DATA') {
    window.wutdoido.auditData = event.data.data;
    
    window.dispatchEvent(new CustomEvent('auditDataLoaded', { 
      detail: window.wutdoido.auditData 
    }));
    
    console.log('Data set on window object:', window.wutdoido.auditData);
  }
}); 