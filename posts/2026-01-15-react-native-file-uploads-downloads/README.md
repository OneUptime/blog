# How to Handle File Uploads and Downloads in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, File Upload, File Download, Mobile Development, API, Storage

Description: Learn how to implement file uploads and downloads in React Native with progress tracking and background support.

---

Mobile applications frequently need to handle file operations - whether it's uploading profile pictures, sharing documents, or downloading media for offline use. React Native provides several ways to accomplish these tasks, though it requires understanding the underlying file systems and choosing the right libraries for your needs.

In this comprehensive guide, we'll explore everything you need to know about handling file uploads and downloads in React Native, from basic implementations to advanced features like progress tracking, background transfers, and resumable operations.

## File System Basics in React Native

Before diving into uploads and downloads, it's essential to understand how file systems work in React Native. Unlike web browsers, mobile devices have specific directories for different types of data.

### Understanding File Paths

React Native applications have access to several directories:

```javascript
import RNFS from 'react-native-fs';

// Common directories available
const directories = {
  // Main document directory - persists across app updates
  documents: RNFS.DocumentDirectoryPath,

  // Cache directory - may be cleared by the system
  cache: RNFS.CachesDirectoryPath,

  // Temporary directory - cleared on app restart
  temp: RNFS.TemporaryDirectoryPath,

  // iOS specific
  mainBundle: RNFS.MainBundlePath,
  library: RNFS.LibraryDirectoryPath,

  // Android specific
  external: RNFS.ExternalDirectoryPath,
  externalCache: RNFS.ExternalCachesDirectoryPath,
  downloads: RNFS.DownloadDirectoryPath,
};
```

### Installing Required Dependencies

For comprehensive file handling, you'll need several libraries:

```bash
# Core file system operations
npm install react-native-fs

# File and image picking
npm install react-native-document-picker
npm install react-native-image-picker

# Background upload/download support
npm install react-native-background-upload
npm install rn-fetch-blob

# For iOS, install pods
cd ios && pod install
```

### Basic File Operations

Here are fundamental file operations you should understand:

```javascript
import RNFS from 'react-native-fs';

// Check if file exists
const checkFileExists = async (filePath) => {
  try {
    const exists = await RNFS.exists(filePath);
    return exists;
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
};

// Read file contents
const readFile = async (filePath) => {
  try {
    const contents = await RNFS.readFile(filePath, 'utf8');
    return contents;
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
};

// Write to file
const writeFile = async (filePath, content) => {
  try {
    await RNFS.writeFile(filePath, content, 'utf8');
    console.log('File written successfully');
  } catch (error) {
    console.error('Error writing file:', error);
    throw error;
  }
};

// Delete file
const deleteFile = async (filePath) => {
  try {
    await RNFS.unlink(filePath);
    console.log('File deleted successfully');
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

// Get file info
const getFileInfo = async (filePath) => {
  try {
    const stat = await RNFS.stat(filePath);
    return {
      size: stat.size,
      isFile: stat.isFile(),
      isDirectory: stat.isDirectory(),
      modificationTime: stat.mtime,
      creationTime: stat.ctime,
    };
  } catch (error) {
    console.error('Error getting file info:', error);
    throw error;
  }
};
```

## Picking Files and Images

The first step in uploading files is allowing users to select them from their device.

### Document Picker Implementation

```javascript
import DocumentPicker from 'react-native-document-picker';

// Pick a single file
const pickSingleFile = async () => {
  try {
    const result = await DocumentPicker.pick({
      type: [DocumentPicker.types.allFiles],
      copyTo: 'cachesDirectory',
    });

    return {
      uri: result[0].uri,
      name: result[0].name,
      type: result[0].type,
      size: result[0].size,
      fileCopyUri: result[0].fileCopyUri,
    };
  } catch (error) {
    if (DocumentPicker.isCancel(error)) {
      console.log('User cancelled file picker');
      return null;
    }
    throw error;
  }
};

// Pick multiple files
const pickMultipleFiles = async () => {
  try {
    const results = await DocumentPicker.pick({
      type: [DocumentPicker.types.allFiles],
      allowMultiSelection: true,
      copyTo: 'cachesDirectory',
    });

    return results.map(file => ({
      uri: file.uri,
      name: file.name,
      type: file.type,
      size: file.size,
      fileCopyUri: file.fileCopyUri,
    }));
  } catch (error) {
    if (DocumentPicker.isCancel(error)) {
      return [];
    }
    throw error;
  }
};

// Pick specific file types
const pickDocuments = async () => {
  try {
    const result = await DocumentPicker.pick({
      type: [
        DocumentPicker.types.pdf,
        DocumentPicker.types.doc,
        DocumentPicker.types.docx,
        DocumentPicker.types.xls,
        DocumentPicker.types.xlsx,
      ],
      copyTo: 'cachesDirectory',
    });
    return result;
  } catch (error) {
    if (DocumentPicker.isCancel(error)) {
      return null;
    }
    throw error;
  }
};
```

### Image Picker Implementation

```javascript
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';

// Pick image from gallery
const pickImageFromGallery = async (options = {}) => {
  const defaultOptions = {
    mediaType: 'photo',
    quality: 0.8,
    maxWidth: 1920,
    maxHeight: 1080,
    includeBase64: false,
    selectionLimit: 1,
    ...options,
  };

  try {
    const result = await launchImageLibrary(defaultOptions);

    if (result.didCancel) {
      return null;
    }

    if (result.errorCode) {
      throw new Error(result.errorMessage);
    }

    return result.assets[0];
  } catch (error) {
    console.error('Error picking image:', error);
    throw error;
  }
};

// Capture image from camera
const captureImage = async (options = {}) => {
  const defaultOptions = {
    mediaType: 'photo',
    quality: 0.8,
    cameraType: 'back',
    saveToPhotos: false,
    ...options,
  };

  try {
    const result = await launchCamera(defaultOptions);

    if (result.didCancel) {
      return null;
    }

    if (result.errorCode) {
      throw new Error(result.errorMessage);
    }

    return result.assets[0];
  } catch (error) {
    console.error('Error capturing image:', error);
    throw error;
  }
};

// Pick video
const pickVideo = async () => {
  const options = {
    mediaType: 'video',
    videoQuality: 'high',
    durationLimit: 60,
  };

  try {
    const result = await launchImageLibrary(options);

    if (result.didCancel) {
      return null;
    }

    return result.assets[0];
  } catch (error) {
    console.error('Error picking video:', error);
    throw error;
  }
};
```

## FormData for Uploads

FormData is the standard way to send files to a server in React Native.

### Basic FormData Upload

```javascript
const uploadFile = async (file, uploadUrl) => {
  const formData = new FormData();

  // Append the file
  formData.append('file', {
    uri: file.uri,
    type: file.type || 'application/octet-stream',
    name: file.name || 'file',
  });

  // Append additional metadata
  formData.append('description', 'Uploaded from React Native');
  formData.append('timestamp', Date.now().toString());

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': 'Bearer YOUR_TOKEN',
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};
```

### Multiple File Upload

```javascript
const uploadMultipleFiles = async (files, uploadUrl) => {
  const formData = new FormData();

  // Append all files
  files.forEach((file, index) => {
    formData.append('files', {
      uri: file.uri,
      type: file.type || 'application/octet-stream',
      name: file.name || `file_${index}`,
    });
  });

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return await response.json();
  } catch (error) {
    console.error('Multiple upload error:', error);
    throw error;
  }
};
```

## Upload Progress Tracking

Tracking upload progress provides essential feedback to users.

### Using XMLHttpRequest for Progress

```javascript
const uploadWithProgress = (file, uploadUrl, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append('file', {
      uri: file.uri,
      type: file.type || 'application/octet-stream',
      name: file.name || 'file',
    });

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(progress, event.loaded, event.total);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Authorization', 'Bearer YOUR_TOKEN');
    xhr.send(formData);
  });
};

// Usage example
const handleUpload = async () => {
  const file = await pickSingleFile();
  if (!file) return;

  try {
    const result = await uploadWithProgress(
      file,
      'https://api.example.com/upload',
      (progress, loaded, total) => {
        console.log(`Progress: ${progress.toFixed(2)}%`);
        console.log(`Uploaded: ${loaded} of ${total} bytes`);
        setUploadProgress(progress);
      }
    );
    console.log('Upload complete:', result);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### Upload Progress Component

```javascript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Progress from 'react-native-progress';

const FileUploader = ({ uploadUrl }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedSize, setUploadedSize] = useState(0);
  const [totalSize, setTotalSize] = useState(0);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSelectAndUpload = async () => {
    const file = await pickSingleFile();
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      await uploadWithProgress(
        file,
        uploadUrl,
        (prog, loaded, total) => {
          setProgress(prog / 100);
          setUploadedSize(loaded);
          setTotalSize(total);
        }
      );
      alert('Upload successful!');
    } catch (error) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={handleSelectAndUpload}
        disabled={uploading}
      >
        <Text style={styles.buttonText}>
          {uploading ? 'Uploading...' : 'Select & Upload File'}
        </Text>
      </TouchableOpacity>

      {uploading && (
        <View style={styles.progressContainer}>
          <Progress.Bar
            progress={progress}
            width={300}
            height={10}
            color="#007AFF"
            borderRadius={5}
          />
          <Text style={styles.progressText}>
            {(progress * 100).toFixed(1)}% ({formatBytes(uploadedSize)} / {formatBytes(totalSize)})
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  progressText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
});
```

## Background Uploads

Background uploads allow file transfers to continue even when the app is in the background.

### Using react-native-background-upload

```javascript
import Upload from 'react-native-background-upload';

const backgroundUpload = async (file, uploadUrl, options = {}) => {
  const uploadOptions = {
    url: uploadUrl,
    path: file.uri.replace('file://', ''),
    method: 'POST',
    type: 'multipart',
    field: 'file',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN',
      'Content-Type': 'multipart/form-data',
    },
    parameters: {
      filename: file.name,
      timestamp: Date.now().toString(),
    },
    notification: {
      enabled: true,
      autoClear: true,
      notificationChannel: 'upload-channel',
      enableRingTone: false,
      onProgressTitle: 'Uploading...',
      onProgressMessage: 'Upload in progress',
      onCompleteTitle: 'Upload Complete',
      onCompleteMessage: 'Your file has been uploaded',
      onErrorTitle: 'Upload Failed',
      onErrorMessage: 'There was an error uploading your file',
    },
    ...options,
  };

  try {
    const uploadId = await Upload.startUpload(uploadOptions);

    Upload.addListener('progress', uploadId, (data) => {
      console.log(`Progress: ${data.progress}%`);
    });

    Upload.addListener('error', uploadId, (data) => {
      console.error('Upload error:', data.error);
    });

    Upload.addListener('cancelled', uploadId, () => {
      console.log('Upload cancelled');
    });

    Upload.addListener('completed', uploadId, (data) => {
      console.log('Upload completed:', data.responseBody);
    });

    return uploadId;
  } catch (error) {
    console.error('Background upload setup error:', error);
    throw error;
  }
};

// Cancel a background upload
const cancelBackgroundUpload = async (uploadId) => {
  try {
    await Upload.cancelUpload(uploadId);
    console.log('Upload cancelled successfully');
  } catch (error) {
    console.error('Error cancelling upload:', error);
  }
};
```

## Downloading Files

Downloading files involves fetching data from a server and saving it to the device.

### Basic File Download

```javascript
import RNFS from 'react-native-fs';

const downloadFile = async (downloadUrl, filename) => {
  const destinationPath = `${RNFS.DocumentDirectoryPath}/${filename}`;

  try {
    const options = {
      fromUrl: downloadUrl,
      toFile: destinationPath,
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN',
      },
    };

    const result = await RNFS.downloadFile(options).promise;

    if (result.statusCode === 200) {
      console.log('Download complete:', destinationPath);
      return destinationPath;
    } else {
      throw new Error(`Download failed with status: ${result.statusCode}`);
    }
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};
```

## Download Progress Tracking

Tracking download progress is crucial for user experience with large files.

### Download with Progress

```javascript
import RNFS from 'react-native-fs';

const downloadWithProgress = async (downloadUrl, filename, onProgress) => {
  const destinationPath = `${RNFS.DocumentDirectoryPath}/${filename}`;

  try {
    // First, get the file size with a HEAD request
    const headResponse = await fetch(downloadUrl, { method: 'HEAD' });
    const contentLength = parseInt(headResponse.headers.get('content-length') || '0', 10);

    const options = {
      fromUrl: downloadUrl,
      toFile: destinationPath,
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN',
      },
      begin: (res) => {
        console.log('Download started:', res.contentLength, 'bytes');
      },
      progress: (res) => {
        const progress = (res.bytesWritten / res.contentLength) * 100;
        onProgress(progress, res.bytesWritten, res.contentLength);
      },
      progressDivider: 1,
    };

    const { jobId, promise } = RNFS.downloadFile(options);

    const result = await promise;

    if (result.statusCode === 200) {
      return destinationPath;
    } else {
      throw new Error(`Download failed: ${result.statusCode}`);
    }
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};
```

### Download Manager Component

```javascript
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import RNFS from 'react-native-fs';

const DownloadManager = () => {
  const [downloads, setDownloads] = useState([]);
  const activeJobs = useRef({});

  const startDownload = async (url, filename) => {
    const id = Date.now().toString();
    const destinationPath = `${RNFS.DocumentDirectoryPath}/${filename}`;

    setDownloads(prev => [...prev, {
      id,
      filename,
      url,
      progress: 0,
      status: 'downloading',
      bytesWritten: 0,
      contentLength: 0,
    }]);

    try {
      const options = {
        fromUrl: url,
        toFile: destinationPath,
        begin: (res) => {
          setDownloads(prev => prev.map(d =>
            d.id === id ? { ...d, contentLength: res.contentLength } : d
          ));
        },
        progress: (res) => {
          const progress = (res.bytesWritten / res.contentLength) * 100;
          setDownloads(prev => prev.map(d =>
            d.id === id ? {
              ...d,
              progress,
              bytesWritten: res.bytesWritten,
            } : d
          ));
        },
        progressDivider: 1,
      };

      const { jobId, promise } = RNFS.downloadFile(options);
      activeJobs.current[id] = jobId;

      await promise;

      setDownloads(prev => prev.map(d =>
        d.id === id ? { ...d, status: 'completed', progress: 100 } : d
      ));
    } catch (error) {
      setDownloads(prev => prev.map(d =>
        d.id === id ? { ...d, status: 'failed', error: error.message } : d
      ));
    }
  };

  const cancelDownload = (id) => {
    const jobId = activeJobs.current[id];
    if (jobId) {
      RNFS.stopDownload(jobId);
      setDownloads(prev => prev.map(d =>
        d.id === id ? { ...d, status: 'cancelled' } : d
      ));
    }
  };

  const retryDownload = (download) => {
    setDownloads(prev => prev.filter(d => d.id !== download.id));
    startDownload(download.url, download.filename);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderDownloadItem = ({ item }) => (
    <View style={styles.downloadItem}>
      <Text style={styles.filename}>{item.filename}</Text>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
      </View>

      <View style={styles.downloadInfo}>
        <Text style={styles.progressText}>
          {item.status === 'downloading' && `${item.progress.toFixed(1)}%`}
          {item.status === 'completed' && 'Complete'}
          {item.status === 'failed' && 'Failed'}
          {item.status === 'cancelled' && 'Cancelled'}
        </Text>
        <Text style={styles.sizeText}>
          {formatBytes(item.bytesWritten)} / {formatBytes(item.contentLength)}
        </Text>
      </View>

      <View style={styles.actions}>
        {item.status === 'downloading' && (
          <TouchableOpacity onPress={() => cancelDownload(item.id)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
        {(item.status === 'failed' || item.status === 'cancelled') && (
          <TouchableOpacity onPress={() => retryDownload(item)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={downloads}
        renderItem={renderDownloadItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No active downloads</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  downloadItem: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  filename: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#ddd',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  downloadInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  sizeText: {
    fontSize: 12,
    color: '#999',
  },
  actions: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelText: {
    color: '#FF3B30',
    fontSize: 14,
  },
  retryText: {
    color: '#007AFF',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
});
```

## Saving to Device Storage

Properly saving files ensures they're accessible and persistent.

### Saving to Different Locations

```javascript
import RNFS from 'react-native-fs';
import { Platform, PermissionsAndroid } from 'react-native';

// Request storage permission on Android
const requestStoragePermission = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Storage Permission',
        message: 'App needs access to storage to save files.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('Permission error:', error);
    return false;
  }
};

// Save to documents (private, persists across updates)
const saveToDocuments = async (data, filename) => {
  const path = `${RNFS.DocumentDirectoryPath}/${filename}`;
  await RNFS.writeFile(path, data, 'utf8');
  return path;
};

// Save to cache (may be cleared by system)
const saveToCache = async (data, filename) => {
  const path = `${RNFS.CachesDirectoryPath}/${filename}`;
  await RNFS.writeFile(path, data, 'utf8');
  return path;
};

// Save to downloads folder (Android - accessible to user)
const saveToDownloads = async (sourcePath, filename) => {
  if (Platform.OS === 'android') {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      throw new Error('Storage permission denied');
    }

    const destPath = `${RNFS.DownloadDirectoryPath}/${filename}`;
    await RNFS.copyFile(sourcePath, destPath);
    return destPath;
  }

  // iOS: Use share sheet instead
  return sourcePath;
};

// Save base64 image
const saveBase64Image = async (base64Data, filename) => {
  const path = `${RNFS.DocumentDirectoryPath}/${filename}`;
  await RNFS.writeFile(path, base64Data, 'base64');
  return path;
};
```

### Sharing Downloaded Files

```javascript
import Share from 'react-native-share';
import RNFS from 'react-native-fs';

const shareFile = async (filePath, mimeType) => {
  try {
    // Read file as base64 for sharing
    const base64Data = await RNFS.readFile(filePath, 'base64');

    const shareOptions = {
      title: 'Share File',
      url: `data:${mimeType};base64,${base64Data}`,
      type: mimeType,
      filename: filePath.split('/').pop(),
    };

    await Share.open(shareOptions);
  } catch (error) {
    if (error.message !== 'User did not share') {
      console.error('Share error:', error);
      throw error;
    }
  }
};

// Share file using file:// URL (iOS)
const shareFileUrl = async (filePath) => {
  try {
    const shareOptions = {
      title: 'Share File',
      url: `file://${filePath}`,
    };

    await Share.open(shareOptions);
  } catch (error) {
    console.error('Share error:', error);
  }
};
```

## File Type Handling

Different file types require different handling approaches.

### MIME Type Detection

```javascript
const getMimeType = (filename) => {
  const extension = filename.split('.').pop().toLowerCase();

  const mimeTypes = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',

    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // Text
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    xml: 'application/xml',
    html: 'text/html',

    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',

    // Video
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    webm: 'video/webm',

    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
  };

  return mimeTypes[extension] || 'application/octet-stream';
};

// File type validation
const validateFileType = (file, allowedTypes) => {
  const fileExtension = file.name.split('.').pop().toLowerCase();
  const fileMimeType = file.type || getMimeType(file.name);

  const isExtensionAllowed = allowedTypes.some(type => {
    if (type.startsWith('.')) {
      return type.substring(1) === fileExtension;
    }
    if (type.includes('/')) {
      if (type.endsWith('/*')) {
        return fileMimeType.startsWith(type.replace('/*', '/'));
      }
      return type === fileMimeType;
    }
    return type === fileExtension;
  });

  return isExtensionAllowed;
};

// Usage
const allowedTypes = ['image/*', '.pdf', '.doc', '.docx'];
const isValid = validateFileType(file, allowedTypes);
```

## Large File Considerations

Handling large files requires special attention to memory and performance.

### Chunked Upload

```javascript
import RNFS from 'react-native-fs';

const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

const uploadLargeFile = async (filePath, uploadUrl, onProgress) => {
  const fileInfo = await RNFS.stat(filePath);
  const totalSize = fileInfo.size;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

  let uploadedBytes = 0;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunkSize = end - start;

    // Read chunk
    const chunk = await RNFS.read(filePath, chunkSize, start, 'base64');

    // Upload chunk
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Range': `bytes ${start}-${end - 1}/${totalSize}`,
        'X-Chunk-Index': chunkIndex.toString(),
        'X-Total-Chunks': totalChunks.toString(),
      },
      body: chunk,
    });

    if (!response.ok) {
      throw new Error(`Chunk upload failed: ${response.status}`);
    }

    uploadedBytes += chunkSize;
    const progress = (uploadedBytes / totalSize) * 100;
    onProgress(progress, uploadedBytes, totalSize);
  }

  return { success: true, totalSize };
};
```

### Stream-based Download for Large Files

```javascript
const downloadLargeFile = async (url, filename, onProgress) => {
  const destPath = `${RNFS.DocumentDirectoryPath}/${filename}`;

  // Use RNFS downloadFile which handles streaming internally
  const options = {
    fromUrl: url,
    toFile: destPath,
    background: true,
    discretionary: true,
    cacheable: false,
    begin: (res) => {
      console.log('Starting download:', res.contentLength, 'bytes');
    },
    progress: (res) => {
      const progress = (res.bytesWritten / res.contentLength) * 100;
      onProgress(progress, res.bytesWritten, res.contentLength);
    },
    progressInterval: 100,
    progressDivider: 1,
  };

  const { jobId, promise } = RNFS.downloadFile(options);

  try {
    const result = await promise;
    return { path: destPath, statusCode: result.statusCode };
  } catch (error) {
    // Clean up partial file on error
    const exists = await RNFS.exists(destPath);
    if (exists) {
      await RNFS.unlink(destPath);
    }
    throw error;
  }
};
```

## Resumable Uploads and Downloads

Implementing resumable transfers improves reliability for large files.

### Resumable Download Implementation

```javascript
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ResumableDownloader {
  constructor() {
    this.activeDownloads = {};
  }

  async getDownloadState(url) {
    const key = `download_${this.hashUrl(url)}`;
    const state = await AsyncStorage.getItem(key);
    return state ? JSON.parse(state) : null;
  }

  async saveDownloadState(url, state) {
    const key = `download_${this.hashUrl(url)}`;
    await AsyncStorage.setItem(key, JSON.stringify(state));
  }

  async clearDownloadState(url) {
    const key = `download_${this.hashUrl(url)}`;
    await AsyncStorage.removeItem(key);
  }

  hashUrl(url) {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  async download(url, filename, onProgress) {
    const destPath = `${RNFS.DocumentDirectoryPath}/${filename}`;
    const tempPath = `${destPath}.tmp`;

    // Check for existing partial download
    let resumeFrom = 0;
    const previousState = await this.getDownloadState(url);

    if (previousState) {
      const exists = await RNFS.exists(tempPath);
      if (exists) {
        const stat = await RNFS.stat(tempPath);
        resumeFrom = stat.size;
      }
    }

    // Get total file size
    const headResponse = await fetch(url, { method: 'HEAD' });
    const totalSize = parseInt(headResponse.headers.get('content-length') || '0', 10);
    const acceptRanges = headResponse.headers.get('accept-ranges');

    // If server doesn't support range requests, start from beginning
    if (acceptRanges !== 'bytes') {
      resumeFrom = 0;
    }

    const headers = {};
    if (resumeFrom > 0) {
      headers['Range'] = `bytes=${resumeFrom}-`;
    }

    const options = {
      fromUrl: url,
      toFile: tempPath,
      headers,
      begin: (res) => {
        console.log('Download resuming from:', resumeFrom);
      },
      progress: (res) => {
        const totalWritten = resumeFrom + res.bytesWritten;
        const progress = (totalWritten / totalSize) * 100;
        onProgress(progress, totalWritten, totalSize);

        // Periodically save state
        this.saveDownloadState(url, {
          url,
          filename,
          totalSize,
          bytesDownloaded: totalWritten,
        });
      },
      progressDivider: 1,
    };

    try {
      const { promise } = RNFS.downloadFile(options);
      await promise;

      // Rename temp file to final destination
      await RNFS.moveFile(tempPath, destPath);
      await this.clearDownloadState(url);

      return destPath;
    } catch (error) {
      // Save current progress for resume
      const exists = await RNFS.exists(tempPath);
      if (exists) {
        const stat = await RNFS.stat(tempPath);
        await this.saveDownloadState(url, {
          url,
          filename,
          totalSize,
          bytesDownloaded: stat.size,
        });
      }
      throw error;
    }
  }
}

// Usage
const downloader = new ResumableDownloader();

const downloadResumable = async () => {
  try {
    const path = await downloader.download(
      'https://example.com/large-file.zip',
      'large-file.zip',
      (progress, downloaded, total) => {
        console.log(`Progress: ${progress.toFixed(2)}%`);
      }
    );
    console.log('Download complete:', path);
  } catch (error) {
    console.log('Download paused/failed, can be resumed');
  }
};
```

## Error Handling and Retry

Robust error handling is essential for reliable file operations.

### Comprehensive Error Handler

```javascript
class FileTransferError extends Error {
  constructor(message, code, originalError) {
    super(message);
    this.name = 'FileTransferError';
    this.code = code;
    this.originalError = originalError;
  }
}

const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  STORAGE_FULL: 'STORAGE_FULL',
  INVALID_URL: 'INVALID_URL',
  SERVER_ERROR: 'SERVER_ERROR',
  CANCELLED: 'CANCELLED',
  UNKNOWN: 'UNKNOWN',
};

const classifyError = (error) => {
  const message = error.message.toLowerCase();

  if (message.includes('network') || message.includes('connection')) {
    return ERROR_CODES.NETWORK_ERROR;
  }
  if (message.includes('timeout')) {
    return ERROR_CODES.TIMEOUT;
  }
  if (message.includes('not found') || message.includes('404')) {
    return ERROR_CODES.FILE_NOT_FOUND;
  }
  if (message.includes('permission') || message.includes('access')) {
    return ERROR_CODES.PERMISSION_DENIED;
  }
  if (message.includes('space') || message.includes('storage')) {
    return ERROR_CODES.STORAGE_FULL;
  }
  if (message.includes('cancel') || message.includes('abort')) {
    return ERROR_CODES.CANCELLED;
  }
  if (message.includes('500') || message.includes('server')) {
    return ERROR_CODES.SERVER_ERROR;
  }

  return ERROR_CODES.UNKNOWN;
};
```

### Retry Logic with Exponential Backoff

```javascript
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async (
  operation,
  options = {}
) => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    retryableErrors = [
      ERROR_CODES.NETWORK_ERROR,
      ERROR_CODES.TIMEOUT,
      ERROR_CODES.SERVER_ERROR,
    ],
    onRetry = null,
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const errorCode = classifyError(error);

      // Don't retry non-retryable errors
      if (!retryableErrors.includes(errorCode)) {
        throw new FileTransferError(
          error.message,
          errorCode,
          error
        );
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw new FileTransferError(
          `Operation failed after ${maxRetries + 1} attempts: ${error.message}`,
          errorCode,
          error
        );
      }

      // Notify about retry
      if (onRetry) {
        onRetry(attempt + 1, delay, error);
      }

      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await sleep(delay);

      // Exponential backoff with jitter
      delay = Math.min(
        delay * backoffFactor + Math.random() * 1000,
        maxDelay
      );
    }
  }

  throw lastError;
};

// Usage example
const uploadWithRetry = async (file, url, onProgress) => {
  return withRetry(
    () => uploadWithProgress(file, url, onProgress),
    {
      maxRetries: 3,
      initialDelay: 2000,
      onRetry: (attempt, delay, error) => {
        console.log(`Retry attempt ${attempt} after error: ${error.message}`);
      },
    }
  );
};
```

### Complete Upload Service

```javascript
class FileUploadService {
  constructor(baseUrl, authToken) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
    this.activeUploads = new Map();
  }

  async uploadFile(file, options = {}) {
    const {
      onProgress,
      onComplete,
      onError,
      maxRetries = 3,
      timeout = 300000,
    } = options;

    const uploadId = Date.now().toString();

    this.activeUploads.set(uploadId, {
      file,
      status: 'uploading',
      progress: 0,
      startTime: Date.now(),
    });

    try {
      const result = await withRetry(
        () => this.performUpload(file, uploadId, onProgress, timeout),
        {
          maxRetries,
          onRetry: (attempt) => {
            this.activeUploads.set(uploadId, {
              ...this.activeUploads.get(uploadId),
              retryAttempt: attempt,
            });
          },
        }
      );

      this.activeUploads.set(uploadId, {
        ...this.activeUploads.get(uploadId),
        status: 'completed',
        progress: 100,
        result,
      });

      if (onComplete) {
        onComplete(result);
      }

      return result;
    } catch (error) {
      this.activeUploads.set(uploadId, {
        ...this.activeUploads.get(uploadId),
        status: 'failed',
        error: error.message,
      });

      if (onError) {
        onError(error);
      }

      throw error;
    }
  }

  async performUpload(file, uploadId, onProgress, timeout) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      formData.append('file', {
        uri: file.uri,
        type: file.type || 'application/octet-stream',
        name: file.name,
      });

      const timeoutId = setTimeout(() => {
        xhr.abort();
        reject(new Error('Upload timeout'));
      }, timeout);

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;

          this.activeUploads.set(uploadId, {
            ...this.activeUploads.get(uploadId),
            progress,
            bytesUploaded: event.loaded,
            totalBytes: event.total,
          });

          if (onProgress) {
            onProgress(progress, event.loaded, event.total);
          }
        }
      });

      xhr.addEventListener('load', () => {
        clearTimeout(timeoutId);

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        clearTimeout(timeoutId);
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Upload cancelled'));
      });

      xhr.open('POST', `${this.baseUrl}/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${this.authToken}`);
      xhr.send(formData);
    });
  }

  cancelUpload(uploadId) {
    const upload = this.activeUploads.get(uploadId);
    if (upload && upload.xhr) {
      upload.xhr.abort();
    }
    this.activeUploads.delete(uploadId);
  }

  getUploadStatus(uploadId) {
    return this.activeUploads.get(uploadId);
  }

  getAllUploads() {
    return Array.from(this.activeUploads.entries());
  }
}

// Usage
const uploadService = new FileUploadService(
  'https://api.example.com',
  'your-auth-token'
);

const handleFileUpload = async (file) => {
  try {
    const result = await uploadService.uploadFile(file, {
      onProgress: (progress) => {
        console.log(`Upload progress: ${progress.toFixed(2)}%`);
      },
      onComplete: (result) => {
        console.log('Upload complete:', result);
      },
      onError: (error) => {
        console.error('Upload failed:', error);
      },
    });

    return result;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};
```

## Conclusion

Handling file uploads and downloads in React Native requires careful consideration of many factors including platform differences, memory management, user experience, and error handling. By implementing the patterns and techniques covered in this guide, you can build robust file handling capabilities in your React Native applications.

Key takeaways:

1. **Choose the right libraries** - Use `react-native-fs` for file system operations, `react-native-document-picker` for file selection, and specialized libraries for background transfers.

2. **Always track progress** - Users need feedback during file operations, especially for large files.

3. **Implement proper error handling** - Network operations can fail for many reasons. Build retry logic with exponential backoff.

4. **Consider background operations** - For large files, use background upload/download capabilities to ensure transfers complete even when the app isn't in the foreground.

5. **Handle permissions correctly** - Always request necessary permissions before accessing storage, especially on Android.

6. **Implement resumable transfers** - For large files, save progress and support resuming interrupted transfers.

7. **Validate file types** - Check file types and sizes before uploading to prevent server errors.

8. **Clean up temporary files** - Remove cached and temporary files when they're no longer needed to save device storage.

By following these best practices, you can create reliable and user-friendly file handling experiences in your React Native applications.
