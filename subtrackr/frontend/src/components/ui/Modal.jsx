import React from 'react';

export function Modal({ onClose, children, size = '' }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal${size ? ` modal-${size}` : ''}`} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
