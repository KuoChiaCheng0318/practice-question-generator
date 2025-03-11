import "./Modal.css"; // Create a CSS file for styling

const Modal = ({ show, onClose, onSubmit, testName, setTestName, testDescription, setTestDescription }) => {
  if (!show) return null; // Don't render if modal is not shown

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Create New Test</h2>
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
          <button onClick={onSubmit}>Create</button>
          <button className="cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
