import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Share, 
  Send, 
  File, 
  Image, 
  MessageSquare, 
  BarChart3,
  Settings,
  Power,
  Users,
  Activity
} from 'lucide-react';
import {
  RTVIClientAudio,
  RTVIClientVideo,
  useRTVIClient,
  useRTVIClientTransportState,
  RTVIClientProvider
} from '@pipecat-ai/client-react';
import { RTVIClient } from '@pipecat-ai/client-js';
import { DailyTransport } from '@pipecat-ai/daily-transport';
import { cn } from './lib/utils';

// Types
interface FileData {
  name: string;
  type: string;
  size: number;
  data: string;
  uploadedAt: string;
}

interface Message {
  sender: 'user' | 'bot' | 'system';
  content: string;
  type: 'text' | 'voice' | 'system';
  timestamp: string;
}

interface Analytics {
  totalMessages: number;
  filesProcessed: number;
  voiceMessages: number;
  textMessages: number;
}

// Configuration - Update these for your deployment
const CONFIG = {
  serverUrl: process.env.VITE_SERVER_URL || 'http://localhost:7860',
  connectEndpoint: '/connect',
  enableAnalytics: true,
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedFileTypes: ['image/*', 'application/pdf', '.docx', '.txt']
};

// File Uploader Component
const FileUploader: React.FC<{
  onFileUpload: (file: FileData) => void;
  className?: string;
}> = ({ onFileUpload, className = '' }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const processFile = useCallback((file: File) => {
    if (file.size > CONFIG.maxFileSize) {
      alert(`File too large. Max size: ${CONFIG.maxFileSize / (1024 * 1024)}MB`);
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const fileData: FileData = {
        name: file.name,
        type: file.type,
        size: file.size,
        data: result.split(',')[1], // Remove data:type;base64, prefix
        uploadedAt: new Date().toISOString()
      };
      onFileUpload(fileData);
      setUploading(false);
    };
    reader.onerror = () => {
      alert('Failed to read file');
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }, [onFileUpload]);

  const handleFileSelect = useCallback((files: FileList) => {
    Array.from(files).forEach(processFile);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  return (
    <div className={className}>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200",
          dragOver ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-300 hover:border-gray-400',
          uploading && 'opacity-50 pointer-events-none'
        )}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className={cn(
          "mx-auto mb-2 h-8 w-8 transition-colors",
          dragOver ? 'text-blue-500' : 'text-gray-400'
        )} />
        <p className="text-sm text-gray-600">
          {uploading ? 'Processing...' : 'Drop files here or click to upload'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Images, PDFs, Word docs, and text files supported
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept={CONFIG.allowedFileTypes.join(',')}
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
      />
    </div>
  );
};

// Chat Panel Component
const ChatPanel: React.FC<{
  messages: Message[];
  onSendMessage: (message: string) => void;
  isVisible: boolean;
}> = ({ messages, onSendMessage, isVisible }) => {
  const [textMessage, setTextMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (textMessage.trim()) {
      onSendMessage(textMessage);
      setTextMessage('');
    }
  };

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-80 bg-white border rounded-lg shadow-sm">
      <div className="flex items-center px-4 py-3 border-b bg-gray-50 rounded-t-lg">
        <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
        <span className="font-medium text-gray-700">Text Chat</span>
        <div className="ml-auto flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500">Live</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Start the conversation...</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              "flex",
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                "max-w-xs px-3 py-2 rounded-lg text-sm relative",
                msg.sender === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : msg.sender === 'system'
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
              )}
            >
              {msg.content}
              {msg.type === 'voice' && (
                <Activity className="inline w-3 h-3 ml-1 opacity-75" />
              )}
              <div className="text-xs opacity-50 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      
      <div className="flex items-center p-3 border-t bg-gray-50 rounded-b-lg">
        <input
          type="text"
          value={textMessage}
          onChange={(e) => setTextMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border rounded-lg mr-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={handleSend}
          disabled={!textMessage.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// File Analysis Panel
const FileAnalysisPanel: React.FC<{
  files: FileData[];
  onAnalyze: (file: FileData) => void;
}> = ({ files, onAnalyze }) => {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-700 flex items-center">
        <File className="h-5 w-5 mr-2 text-blue-600" />
        Uploaded Files ({files.length})
      </h3>
      
      {files.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <File className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No files uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {files.map((file, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center flex-1 min-w-0">
                {file.type.startsWith('image/') ? (
                  <Image className="h-5 w-5 mr-3 text-blue-500 flex-shrink-0" />
                ) : (
                  <File className="h-5 w-5 mr-3 text-gray-500 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB • {new Date(file.uploadedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => onAnalyze(file)}
                className="ml-3 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex-shrink-0"
              >
                Analyze
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Screen Share Component
const ScreenShare: React.FC<{
  isSharing: boolean;
  onToggle: () => void;
}> = ({ isSharing, onToggle }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700 flex items-center">
          <Share className="h-5 w-5 mr-2 text-blue-600" />
          Screen Sharing
        </h3>
        <button
          onClick={onToggle}
          className={cn(
            "px-4 py-2 rounded-lg font-medium transition-colors",
            isSharing
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-green-500 text-white hover:bg-green-600'
          )}
        >
          {isSharing ? 'Stop Sharing' : 'Start Sharing'}
        </button>
      </div>
      
      {isSharing ? (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
            <span className="text-sm text-blue-700">
              Screen sharing active - AI can see and analyze your screen
            </span>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">
            Share your screen to get contextual help with applications, websites, or any visual content.
          </p>
        </div>
      )}
    </div>
  );
};

// Analytics Panel
const AnalyticsPanel: React.FC<{
  data: Analytics;
  onRefresh: () => void;
}> = ({ data, onRefresh }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
          Conversation Analytics
        </h3>
        <button
          onClick={onRefresh}
          className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Refresh
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-600 font-medium">Total Messages</p>
          <p className="text-xl font-bold text-blue-800">{data.totalMessages}</p>
        </div>
        <div className="p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
          <p className="text-xs text-green-600 font-medium">Files Processed</p>
          <p className="text-xl font-bold text-green-800">{data.filesProcessed}</p>
        </div>
        <div className="p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
          <p className="text-xs text-purple-600 font-medium">Voice Messages</p>
          <p className="text-xl font-bold text-purple-800">{data.voiceMessages}</p>
        </div>
        <div className="p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
          <p className="text-xs text-orange-600 font-medium">Text Messages</p>
          <p className="text-xl font-bold text-orange-800">{data.textMessages}</p>
        </div>
      </div>
    </div>
  );
};

// Connection Status Component
const ConnectionStatus: React.FC<{
  transportState: string;
  onConnect: () => void;
  onDisconnect: () => void;
}> = ({ transportState, onConnect, onDisconnect }) => {
  const isConnected = ['connected', 'ready'].includes(transportState);
  const isConnecting = ['connecting'].includes(transportState);

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        <div className={cn(
          "w-3 h-3 rounded-full",
          isConnected ? 'bg-green-500 animate-pulse' :
          isConnecting ? 'bg-yellow-500 animate-spin' : 'bg-red-500'
        )}></div>
        <span className="text-sm font-medium capitalize">{transportState}</span>
      </div>
      
      <button
        onClick={isConnected ? onDisconnect : onConnect}
        disabled={isConnecting}
        className={cn(
          "px-4 py-2 rounded-lg font-medium transition-colors",
          isConnected
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-blue-500 text-white hover:bg-blue-600',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isConnected ? (
          <>
            <Power className="h-4 w-4 mr-2 inline" />
            Disconnect
          </>
        ) : (
          <>
            <Power className="h-4 w-4 mr-2 inline" />
            Connect
          </>
        )}
      </button>
    </div>
  );
};

// Main App Component with RTVI Client
const RTVIApp: React.FC = () => {
  const client = useRTVIClient();
  const transportState = useRTVIClientTransportState();
  
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<FileData[]>([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalMessages: 0,
    filesProcessed: 0,
    voiceMessages: 0,
    textMessages: 0
  });

  const isConnected = ['connected', 'ready'].includes(transportState);

  // Add welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        sender: 'system',
        content: 'Welcome! Connect to start your multi-modal AI conversation.',
        type: 'system',
        timestamp: new Date().toISOString()
      }]);
    }
  }, [messages.length]);

  // Handle file upload
  const handleFileUpload = useCallback(async (fileData: FileData) => {
    try {
      if (!client) {
        alert('Please connect first');
        return;
      }

      await client.action({
        service: 'file_processor',
        action: 'upload_file',
        arguments: [
          { name: 'file_data', value: fileData.data },
          { name: 'filename', value: fileData.name },
          { name: 'file_type', value: fileData.type }
        ]
      });

      setUploadedFiles(prev => [...prev, fileData]);
      
      setMessages(prev => [...prev, {
        sender: 'system',
        content: `File uploaded: ${fileData.name}`,
        type: 'system',
        timestamp: new Date().toISOString()
      }]);

      setAnalytics(prev => ({
        ...prev,
        filesProcessed: prev.filesProcessed + 1
      }));

    } catch (error) {
      console.error('File upload failed:', error);
      setMessages(prev => [...prev, {
        sender: 'system',
        content: `Failed to upload ${fileData.name}`,
        type: 'system',
        timestamp: new Date().toISOString()
      }]);
    }
  }, [client]);

  // Handle text message
  const handleSendMessage = useCallback(async (message: string) => {
    try {
      if (!client) {
        alert('Please connect first');
        return;
      }

      await client.action({
        service: 'chat',
        action: 'send_text',
        arguments: [
          { name: 'message', value: message },
          { name: 'mode', value: 'mixed' }
        ]
      });

      setMessages(prev => [...prev, {
        sender: 'user',
        content: message,
        type: 'text',
        timestamp: new Date().toISOString()
      }]);

      setAnalytics(prev => ({
        ...prev,
        totalMessages: prev.totalMessages + 1,
        textMessages: prev.textMessages + 1
      }));

    } catch (error) {
      console.error('Send message failed:', error);
    }
  }, [client]);

  // Handle screen sharing
  const handleScreenShareToggle = useCallback(async () => {
    try {
      if (!client) {
        alert('Please connect first');
        return;
      }

      const newState = !isScreenSharing;
      
      await client.action({
        service: 'screen',
        action: 'toggle_sharing',
        arguments: [
          { name: 'enabled', value: newState }
        ]
      });

      setIsScreenSharing(newState);
      
      setMessages(prev => [...prev, {
        sender: 'system',
        content: `Screen sharing ${newState ? 'started' : 'stopped'}`,
        type: 'system',
        timestamp: new Date().toISOString()
      }]);

    } catch (error) {
      console.error('Screen share toggle failed:', error);
    }
  }, [client, isScreenSharing]);

  // Handle file analysis
  const handleAnalyzeFile = useCallback(async (file: FileData) => {
    try {
      if (!client) {
        alert('Please connect first');
        return;
      }

      await client.action({
        service: 'analysis',
        action: 'analyze_content',
        arguments: [
          { name: 'content_type', value: 'file' },
          { name: 'data', value: { filename: file.name, type: file.type } }
        ]
      });

      setMessages(prev => [...prev, {
        sender: 'system',
        content: `Analyzing file: ${file.name}`,
        type: 'system',
        timestamp: new Date().toISOString()
      }]);

    } catch (error) {
      console.error('File analysis failed:', error);
    }
  }, [client]);

  // Handle analytics refresh
  const handleRefreshAnalytics = useCallback(async () => {
    try {
      if (!client) return;

      const result = await client.action({
        service: 'analysis',
        action: 'analyze_content',
        arguments: [
          { name: 'content_type', value: 'conversation' },
          { name: 'data', value: {} }
        ]
      });

      console.log('Analytics refreshed:', result);

    } catch (error) {
      console.error('Analytics refresh failed:', error);
    }
  }, [client]);

  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'files', label: 'Files', icon: File },
    { id: 'screen', label: 'Screen', icon: Share },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                <Activity className="h-8 w-8 mr-3 text-blue-600" />
                Advanced AI Assistant
              </h1>
              <p className="text-gray-600 mt-1">
                Multi-modal conversation with voice, text, files, and screen sharing
              </p>
            </div>
            
            <ConnectionStatus
              transportState={transportState}
              onConnect={() => client?.connect()}
              onDisconnect={() => client?.disconnect()}
            />
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video & Chat Panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Panel */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
              <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-700 relative">
                {isConnected ? (
                  <RTVIClientVideo participant="bot" fit="cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-white">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-4 bg-gray-600 rounded-full flex items-center justify-center text-3xl">
                        🤖
                      </div>
                      <h3 className="text-xl font-semibold mb-2">AI Assistant</h3>
                      <p className="text-gray-300">Connect to start conversation</p>
                    </div>
                  </div>
                )}
                
                {/* Controls overlay */}
                <div className="absolute bottom-4 left-4 flex space-x-2">
                  <button
                    onClick={() => setIsMicEnabled(!isMicEnabled)}
                    className={cn(
                      "p-3 rounded-full text-white hover:opacity-80 transition-all",
                      isMicEnabled ? 'bg-green-500' : 'bg-red-500'
                    )}
                    title={isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
                  >
                    {isMicEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                  </button>
                  
                  <button
                    onClick={() => setIsCameraEnabled(!isCameraEnabled)}
                    className={cn(
                      "p-3 rounded-full text-white hover:opacity-80 transition-all",
                      isCameraEnabled ? 'bg-green-500' : 'bg-gray-500'
                    )}
                    title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
                  >
                    {isCameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                  </button>
                </div>

                {/* Status indicator */}
                <div className="absolute top-4 right-4">
                  <div className="flex items-center space-x-2 bg-black bg-opacity-50 rounded-full px-3 py-1">
                    <Users className="h-4 w-4 text-white" />
                    <span className="text-white text-sm">1 connected</span>
                  </div>
                </div>
              </div>
              
              {/* Chat toggle */}
              <div className="p-4 border-t bg-gray-50">
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <MessageSquare className="h-5 w-5" />
                  <span>{showChat ? 'Hide' : 'Show'} Text Chat</span>
                </button>
              </div>
            </div>

            {/* Chat Panel */}
            {showChat && (
              <ChatPanel
                messages={messages}
                onSendMessage={handleSendMessage}
                isVisible={showChat}
              />
            )}
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="border-b">
                <nav className="flex space-x-1 p-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          activeTab === tab.id
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
              
              {/* Tab Content */}
              <div className="p-4">
                {activeTab === 'chat' && (
                  <div className="text-center text-gray-500 py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Chat panel shown below video</p>
                    <p className="text-xs mt-1">Toggle visibility with the button above</p>
                  </div>
                )}
                
                {activeTab === 'files' && (
                  <div className="space-y-4">
                    <FileUploader onFileUpload={handleFileUpload} />
                    <FileAnalysisPanel files={uploadedFiles} onAnalyze={handleAnalyzeFile} />
                  </div>
                )}
                
                {activeTab === 'screen' && (
                  <ScreenShare isSharing={isScreenSharing} onToggle={handleScreenShareToggle} />
                )}
                
                {activeTab === 'analytics' && (
                  <AnalyticsPanel data={analytics} onRefresh={handleRefreshAnalytics} />
                )}
              </div>
            </div>
          </div>
        </div>

        <RTVIClientAudio />
      </div>
    </div>
  );
};

// RTVI Provider Component
const RTVIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const transport = new DailyTransport();

  const client = new RTVIClient({
    transport,
    params: {
      baseUrl: CONFIG.serverUrl,
      endpoints: {
        connect: CONFIG.connectEndpoint,
      },
    },
    enableMic: true,
    enableCam: false,
  });

  return (
    <RTVIClientProvider client={client}>
      {children}
    </RTVIClientProvider>
  );
};

// Main App Component
const App: React.FC = () => {
  return (
    <RTVIProvider>
      <RTVIApp />
    </RTVIProvider>
  );
};

export default App;
