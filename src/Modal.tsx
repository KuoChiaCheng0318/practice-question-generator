import "./Modal.css"; // Create a CSS file for styling

interface ModalProps {
    show: boolean;
    onClose: () => void;
    onSubmit: () => void;
    testName: string;
    setTestName: (value: string) => void;
    testDescription: string;
    setTestDescription: (value: string) => void;
  }
  
  const Modal: React.FC<ModalProps> = ({
    show,
    onClose,
    onSubmit,
    testName,
    setTestName,
    testDescription,
    setTestDescription,
  }) => {
    if (!show) return null; // Don't render if modal is not shown
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button
          className="close-icon"
          onClick={onClose} // Call the onClose prop to close the modal
          aria-label="Close Modal" // Accessibility label for screen readers
        >
          &times;
        </button>
        <h2>New Test</h2>
        <input
          type="text"
          placeholder="Test Name"
          value={testName}
          onChange={(e) => setTestName(e.target.value)}
        />
        <textarea
          placeholder="Test Description"
          value={testDescription}
          onChange={(e) => setTestDescription(e.target.value)}
        />
        <div className="modal-buttons">
          <button onClick={onSubmit}>+ Create Test</button>
          </div>
      </div>
    </div>
  );
};

export default Modal;
