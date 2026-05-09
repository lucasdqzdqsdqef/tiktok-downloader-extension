document.addEventListener('DOMContentLoaded', () => {
  const subfolderInput = document.getElementById('subfolder');
  const namingInput = document.getElementById('naming');
  const saveBtn = document.getElementById('saveBtn');
  const saveText = saveBtn.querySelector('span');

  // Load settings
  chrome.storage.local.get(['subfolder', 'naming'], (result) => {
    if (result.subfolder !== undefined) {
      subfolderInput.value = result.subfolder;
    }
    if (result.naming !== undefined) {
      namingInput.value = result.naming;
    }
  });

  // Save settings
  saveBtn.addEventListener('click', () => {
    const settings = {
      subfolder: subfolderInput.value.trim(),
      naming: namingInput.value.trim() || '{uploader} - {id}'
    };

    chrome.storage.local.set(settings, () => {
      saveBtn.classList.add('success');
      saveText.textContent = 'Saved!';
      
      setTimeout(() => {
        saveBtn.classList.remove('success');
        saveText.textContent = 'Save Preferences';
      }, 2000);
    });
  });
});
