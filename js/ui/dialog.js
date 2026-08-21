export function openDialog(html, { onClose } = {}) {
  const dialog = document.createElement('dialog');
  dialog.className = 'dialog';
  dialog.innerHTML = html;
  document.body.appendChild(dialog);

  const close = () => {
    if (dialog.open) dialog.close();
    onClose?.();
    dialog.remove();
  };

  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) close();
  });
  dialog.querySelectorAll('[data-dialog-close]').forEach(button => button.addEventListener('click', close));
  dialog.showModal();
  return { dialog, close };
}
