# How to Fix Error: EPERM: operation not permitted in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, FileSystem, Permissions, ErrorHandling, Windows

Description: Learn how to diagnose and fix the EPERM operation not permitted error in Node.js, common on Windows when files are locked or permissions are insufficient.

---

The `EPERM: operation not permitted` error occurs when Node.js cannot perform a file system operation due to permission restrictions. This is particularly common on Windows but can occur on any operating system.

## Understanding the Error

```bash
Error: EPERM: operation not permitted, unlink 'C:\project\file.txt'
Error: EPERM: operation not permitted, rename 'C:\temp\file' -> 'C:\project\file'
Error: EPERM: operation not permitted, open 'C:\protected\file.txt'
```

Common causes:
- File is open in another process
- Insufficient user permissions
- File is read-only
- Antivirus software blocking access
- Windows file locking

## Common Scenarios and Solutions

### 1. File Locked by Another Process

The most common cause on Windows:

```javascript
const fs = require('fs').promises;

async function safeDelete(filePath, retries = 5, delay = 100) {
  for (let i = 0; i < retries; i++) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code === 'EPERM' || error.code === 'EBUSY') {
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;  // Exponential backoff
      } else {
        throw error;
      }
    }
  }
  throw new Error(`Failed to delete ${filePath} after ${retries} retries`);
}
```

### 2. npm/Node Modules Issues

```bash
# Error during npm install
npm ERR! Error: EPERM: operation not permitted, rename 'node_modules\...'
```

Solutions:

```bash
# Close all Node processes
taskkill /f /im node.exe  # Windows
pkill node                 # Linux/macOS

# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules
npm install

# On Windows, use rimraf
npx rimraf node_modules
npm install
```

### 3. Read-Only Files

```javascript
const fs = require('fs').promises;

async function removeReadOnly(filePath) {
  try {
    // Check if file is read-only
    const stats = await fs.stat(filePath);
    
    if (!(stats.mode & 0o200)) {
      // Make writable
      await fs.chmod(filePath, stats.mode | 0o200);
    }
    
    // Now delete
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
```

### 4. Directory Deletion

```javascript
const fs = require('fs').promises;
const path = require('path');

async function removeDirectory(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await removeDirectory(fullPath);
      } else {
        // Handle read-only files
        try {
          await fs.unlink(fullPath);
        } catch (error) {
          if (error.code === 'EPERM') {
            // Try making writable first
            await fs.chmod(fullPath, 0o666);
            await fs.unlink(fullPath);
          } else {
            throw error;
          }
        }
      }
    }
    
    await fs.rmdir(dir);
  } catch (error) {
    console.error(`Failed to remove ${dir}:`, error);
    throw error;
  }
}
```

### Using rimraf for Robust Deletion

```bash
npm install rimraf
```

```javascript
const { rimraf } = require('rimraf');

// Delete directory with all contents
await rimraf('node_modules');

// With options
await rimraf('temp/*', {
  glob: true,
  maxRetries: 3,
  backoff: 100,
});
```

## Windows-Specific Solutions

### Run as Administrator

```bash
# Open PowerShell as Administrator
# Then run your command
node script.js
```

### Check for Locking Processes

```powershell
# Find what's locking a file
handle.exe path\to\file  # Sysinternals Handle

# Or use Resource Monitor
resmon.exe
# Go to CPU tab > Associated Handles > Search for file
```

### Disable Antivirus Temporarily

Some antivirus software locks files during scanning:

```javascript
// Add delay before file operations
async function writeWithDelay(path, data) {
  await fs.writeFile(path, data);
  
  // Wait for antivirus scan to complete
  await new Promise(resolve => setTimeout(resolve, 100));
}
```

### Windows Defender Exclusion

Add your project folder to Windows Defender exclusions:

```powershell
Add-MpPreference -ExclusionPath "C:\Projects\myapp"
```

## Handling EPERM in Production

### Graceful Error Handling

```javascript
const fs = require('fs').promises;

async function safeFileOperation(operation, filePath, options = {}) {
  const { retries = 3, delay = 100 } = options;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isRetryable = ['EPERM', 'EBUSY', 'ENOTEMPTY'].includes(error.code);
      
      if (isRetryable && attempt < retries) {
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay * attempt));
      } else {
        throw error;
      }
    }
  }
}

// Usage
await safeFileOperation(
  () => fs.unlink('file.txt'),
  'file.txt',
  { retries: 5, delay: 200 }
);
```

### File Lock Wrapper

```javascript
const fs = require('fs').promises;

class FileLock {
  constructor() {
    this.locks = new Map();
  }
  
  async acquire(filePath) {
    while (this.locks.has(filePath)) {
      await new Promise(r => setTimeout(r, 50));
    }
    this.locks.set(filePath, true);
  }
  
  release(filePath) {
    this.locks.delete(filePath);
  }
  
  async withLock(filePath, operation) {
    await this.acquire(filePath);
    try {
      return await operation();
    } finally {
      this.release(filePath);
    }
  }
}

const fileLock = new FileLock();

// Usage
await fileLock.withLock('data.json', async () => {
  const data = await fs.readFile('data.json', 'utf8');
  const updated = JSON.parse(data);
  updated.count++;
  await fs.writeFile('data.json', JSON.stringify(updated));
});
```

## Cross-Platform Considerations

### Normalize Paths

```javascript
const path = require('path');

// Always use path.join for cross-platform compatibility
const filePath = path.join(__dirname, 'data', 'file.txt');

// Normalize paths
const normalizedPath = path.normalize(userInput);
```

### Handle Different Error Codes

```javascript
async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    switch (error.code) {
      case 'EPERM':
        // Permission denied (Windows)
        throw new Error('Permission denied. File may be locked.');
      case 'EACCES':
        // Permission denied (Unix)
        throw new Error('Permission denied. Check file permissions.');
      case 'ENOENT':
        // File doesn't exist - already deleted
        return;
      case 'EBUSY':
        // Resource busy
        throw new Error('File is in use by another process.');
      default:
        throw error;
    }
  }
}
```

## Preventing EPERM Errors

### Always Close File Handles

```javascript
const fs = require('fs');

// Using try/finally
let fd;
try {
  fd = fs.openSync('file.txt', 'r');
  // Read operations
} finally {
  if (fd !== undefined) {
    fs.closeSync(fd);
  }
}

// Using fs.promises with proper cleanup
async function readWithCleanup(path) {
  let handle;
  try {
    handle = await fs.promises.open(path, 'r');
    return await handle.readFile('utf8');
  } finally {
    await handle?.close();
  }
}
```

### Use Streams Properly

```javascript
const fs = require('fs');

function processFile(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(inputPath);
    const writeStream = fs.createWriteStream(outputPath);
    
    readStream.pipe(writeStream);
    
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
    readStream.on('error', reject);
  });
}
```

### Temporary Files

```javascript
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

async function processWithTemp(inputPath, outputPath) {
  const tempPath = path.join(os.tmpdir(), `temp-${Date.now()}`);
  
  try {
    // Process to temp file
    await processFile(inputPath, tempPath);
    
    // Move to final location
    await fs.rename(tempPath, outputPath);
  } finally {
    // Clean up temp file if it exists
    try {
      await fs.unlink(tempPath);
    } catch (e) {
      // Ignore if already deleted
    }
  }
}
```

## npm Specific Issues

### Fix npm Permission Errors

```bash
# Check npm prefix
npm config get prefix

# On Windows, use npm properly installed paths
# Or use nvm-windows

# Fix ownership on macOS/Linux
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
```

### Clear All Caches

```bash
# Clear npm cache
npm cache clean --force

# Delete package-lock
rm package-lock.json

# Delete node_modules
rm -rf node_modules

# Reinstall
npm install
```

## Summary

| Cause | Solution |
|-------|----------|
| File locked | Close other processes, retry with backoff |
| Read-only file | Change permissions with `chmod` |
| npm issues | Clear cache, delete node_modules |
| Antivirus | Add exclusion, use delays |
| Administrator needed | Run as admin (Windows) |
| Insufficient permissions | Check file/folder ownership |

Best practices:
- Always close file handles properly
- Implement retry logic for file operations
- Use libraries like rimraf for deletion
- Handle platform-specific error codes
- Add delays when dealing with antivirus software
- Use temporary files for atomic operations
