import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import Sidebar from '../components/Sidebar';

export default function Settings() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [currentResumeUrl, setCurrentResumeUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkCurrentResume();
  }, [user]);

  const checkCurrentResume = async () => {
    if (!user) return;
    
    try {
      // Check if file exists by trying to create a signed URL
      const { data, error } = await supabase.storage
        .from('resumes')
        .createSignedUrl(`${user.id}/base_resume.pdf`, 60 * 60); // 1 hour expiry

      if (data?.signedUrl) {
        setCurrentResumeUrl(data.signedUrl);
      }
    } catch (err) {
      console.error('Error checking current resume:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    setUploadSuccess(false);
    
    if (selectedFile.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.');
      return;
    }
    
    if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
      setError('File size must be less than 5MB.');
      return;
    }
    
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    
    setIsUploading(true);
    setError(null);
    setUploadSuccess(false);
    
    try {
      const filePath = `${user.id}/base_resume.pdf`;
      
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, {
          upsert: true,
          contentType: 'application/pdf'
        });
        
      if (uploadError) throw uploadError;
      
      setUploadSuccess(true);
      setFile(null);
      await checkCurrentResume();
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);
      
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'An error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex h-screen bg-brand-black overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Settings</h1>
            <p className="text-zinc-400 mt-2">Manage your account preferences and base documents.</p>
          </div>
          
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
            <div className="p-6 border-b border-zinc-800/80">
              <h2 className="text-xl font-display font-bold text-white flex items-center">
                <FileText className="w-5 h-5 mr-2 text-brand-cyan" />
                Resume Management
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Upload your base resume. This will be used by the AI to draft tailored cover letters and applications.
              </p>
            </div>
            
            <div className="p-6">
              {/* Upload Area */}
              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                  isDragging 
                    ? 'border-brand-cyan bg-brand-cyan/5' 
                    : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/30'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,application/pdf"
                  className="hidden"
                />
                
                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4 shadow-inner">
                    <UploadCloud className={`w-8 h-8 ${isDragging ? 'text-brand-cyan' : 'text-zinc-400'}`} />
                  </div>
                  
                  <h3 className="text-lg font-medium text-white mb-1">
                    Drop your resume here
                  </h3>
                  <p className="text-sm text-zinc-400 mb-6">
                    Strictly PDF files only (max 5MB)
                  </p>
                  
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors border border-zinc-700"
                  >
                    Browse Files
                  </button>
                </div>
              </div>
              
              {/* Selected File Feedback */}
              {file && (
                <div className="mt-6 p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="w-8 h-8 text-brand-cyan mr-3" />
                    <div>
                      <p className="text-sm font-medium text-white">{file.name}</p>
                      <p className="text-xs text-zinc-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="flex items-center px-4 py-2 bg-brand-cyan text-brand-black font-bold rounded-lg hover:bg-[#5ce0dd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      'Upload to System'
                    )}
                  </button>
                </div>
              )}
              
              {/* Error Message */}
              {error && (
                <div className="mt-4 p-3 bg-brand-red/10 border border-brand-red/20 rounded-lg text-brand-red text-sm">
                  {error}
                </div>
              )}
              
              {/* Success Toast / Message */}
              {uploadSuccess && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Resume uploaded successfully!
                </div>
              )}
              
              {/* Current Resume Section */}
              {currentResumeUrl && (
                <div className="mt-8 pt-6 border-t border-zinc-800/80">
                  <h3 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">Current Base Resume</h3>
                  <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-lg bg-brand-cyan/10 flex items-center justify-center mr-3">
                        <FileText className="w-5 h-5 text-brand-cyan" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">base_resume.pdf</p>
                        <p className="text-xs text-zinc-500">Active in system</p>
                      </div>
                    </div>
                    
                    <a 
                      href={currentResumeUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center px-3 py-1.5 text-sm font-medium text-brand-cyan hover:text-white hover:bg-brand-cyan/10 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 mr-1.5" />
                      View Current
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
