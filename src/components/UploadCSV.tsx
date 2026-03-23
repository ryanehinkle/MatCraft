type UploadCsvProps = {
    onFileSelect: (file: File) => void;
  };
  
  function UploadCsv({ onFileSelect }: UploadCsvProps) {
    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
      const file = event.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    }
  
    return (
      <label className="upload-button">
        Upload Material List (CSV)
        <input
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="upload-input"
        />
      </label>
    );
  }
  
  export default UploadCsv;