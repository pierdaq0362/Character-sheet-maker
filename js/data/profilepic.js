// ============================================================================
// Character profile picture — click the box in the banner to upload a photo.
// Resized client-side (max 300x300, JPEG) before storing so save files and
// printed PDFs don't balloon. Persists via the sheet's existing generic
// [name]-field save/load (hidden #profilePictureField input), same pattern
// as js/data/summons.js's #activeSummonsField.
// ============================================================================

(function(){

  const MAX_DIM = 300;

  function resizeImage(dataUrl){
    return new Promise((resolve)=>{
      const img = new Image();
      img.onload = ()=>{
        let { width, height } = img;
        if(width > height && width > MAX_DIM){
          height = Math.round(height * (MAX_DIM / width));
          width = MAX_DIM;
        } else if(height > MAX_DIM){
          width = Math.round(width * (MAX_DIM / height));
          height = MAX_DIM;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        try {
          const ctx = canvas.getContext('2d');
          if(!ctx) throw new Error('no 2d context');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } catch(e){
          resolve(dataUrl); // canvas unavailable — store the original instead
        }
      };
      img.onerror = ()=> resolve(dataUrl); // fall back to original if it won't decode
      img.src = dataUrl;
    });
  }

  function showPicture(dataUrl){
    const img = document.getElementById('profilePicImg');
    const placeholder = document.getElementById('profilePicPlaceholder');
    const removeBtn = document.getElementById('btnRemoveProfilePic');
    if(dataUrl){
      img.src = dataUrl;
      img.style.display = 'block';
      placeholder.style.display = 'none';
      removeBtn.style.display = '';
    } else {
      img.style.display = 'none';
      img.removeAttribute('src');
      placeholder.style.display = '';
      removeBtn.style.display = 'none';
    }
  }

  function setPicture(dataUrl){
    const field = document.getElementById('profilePictureField');
    if(field) field.value = dataUrl || '';
    showPicture(dataUrl);
  }

  function refreshFromField(){
    const field = document.getElementById('profilePictureField');
    showPicture(field ? field.value : '');
  }

  function handleFile(file){
    if(!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async ()=>{
      const resized = await resizeImage(reader.result);
      setPicture(resized);
      if(typeof showToast === 'function') showToast('Photo added.');
    };
    reader.readAsDataURL(file);
  }

  function init(){
    const box = document.getElementById('profilePicBox');
    const input = document.getElementById('profilePicInput');
    const removeBtn = document.getElementById('btnRemoveProfilePic');
    if(box && input){
      box.addEventListener('click', (e)=>{
        if(e.target === removeBtn) return;
        input.click();
      });
      input.addEventListener('change', ()=>{
        if(input.files && input.files[0]) handleFile(input.files[0]);
        input.value = '';
      });
    }
    if(removeBtn){
      removeBtn.addEventListener('click', (e)=>{
        e.stopPropagation();
        setPicture('');
      });
    }

    // Load File doesn't fire input/change events on restored fields, so
    // re-render shortly after a file is chosen to pick up a loaded photo.
    const fileInput = document.getElementById('fileInput');
    if(fileInput) fileInput.addEventListener('change', ()=> setTimeout(refreshFromField, 400));

    // "New Character" only clears plain text/checkbox/select fields in
    // js/app.js — hidden fields like ours are untouched. Both listeners on
    // this button fire synchronously in the same click dispatch, so by the
    // time this one runs, a confirmed reset has already happened (or, if
    // the user cancelled the confirm() prompt, it hasn't) — check charName
    // to tell which, rather than a fixed delay.
    const newBtn = document.getElementById('btnNew');
    if(newBtn){
      newBtn.addEventListener('click', ()=>{
        const nameField = document.querySelector('[name="charName"]');
        if(nameField && nameField.value === '') setPicture('');
      });
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
