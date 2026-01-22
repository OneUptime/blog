# How to Execute Child Processes in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, ChildProcess, Shell, SystemAdmin, JavaScript

Description: Learn how to execute shell commands and spawn child processes in Node.js using exec, execFile, spawn, and fork with practical examples and error handling.

---

Node.js can execute shell commands and run other programs through the child_process module. This is useful for running scripts, executing system commands, and offloading CPU-intensive work.

## Quick Reference

```javascript
const { exec, execSync, spawn, fork } = require('child_process');

// exec - Run command in shell (buffered output)
exec('ls -la', (error, stdout, stderr) => {
  console.log(stdout);
});

// execSync - Synchronous version
const output = execSync('ls -la').toString();

// spawn - Stream output (better for large data)
const child = spawn('ls', ['-la']);
child.stdout.on('data', data => console.log(data.toString()));

// fork - Run Node.js modules (IPC channel)
const worker = fork('./worker.js');
worker.send({ task: 'process' });
```

## Using exec()

Runs a command in a shell and buffers the output:

```javascript
const { exec } = require('child_process');

// Basic usage
exec('ls -la', (error, stdout, stderr) => {
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  if (stderr) {
    console.error('stderr:', stderr);
    return;
  }
  console.log('Output:', stdout);
});
```

### With Options

```javascript
const { exec } = require('child_process');

exec('npm install', {
  cwd: '/path/to/project',     // Working directory
  env: { ...process.env, NODE_ENV: 'production' },
  timeout: 60000,               // Timeout in ms
  maxBuffer: 1024 * 1024 * 10,  // 10MB buffer
  encoding: 'utf8',
  shell: '/bin/bash',           // Specific shell
}, (error, stdout, stderr) => {
  if (error) {
    console.error('Exit code:', error.code);
    return;
  }
  console.log(stdout);
});
```

### Promise Wrapper

```javascript
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

async function runCommand(command) {
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr) console.warn('Warning:', stderr);
    return stdout;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Usage
async function main() {
  const files = await runCommand('ls -la');
  console.log(files);
  
  const branch = await runCommand('git branch --show-current');
  console.log('Current branch:', branch.trim());
}
```

## Using execSync()

Synchronous execution (blocks the event loop):

```javascript
const { execSync } = require('child_process');

// Basic usage
try {
  const output = execSync('ls -la').toString();
  console.log(output);
} catch (error) {
  console.error('Command failed:', error.message);
}
```

### With Options

```javascript
const { execSync } = require('child_process');

const output = execSync('npm run build', {
  cwd: '/path/to/project',
  stdio: 'inherit',  // Inherit stdio from parent (shows output live)
  timeout: 120000,
  encoding: 'utf8',
});
```

### Capture vs Inherit Output

```javascript
const { execSync } = require('child_process');

// Capture output (silent, returns buffer)
const captured = execSync('echo "hello"');
console.log('Captured:', captured.toString());

// Inherit output (shows in console, returns nothing useful)
execSync('npm install', { stdio: 'inherit' });

// Pipe specific streams
execSync('npm test', { stdio: ['pipe', 'inherit', 'inherit'] });
// stdin: pipe, stdout: inherit, stderr: inherit
```

## Using spawn()

For long-running processes or streaming large outputs:

```javascript
const { spawn } = require('child_process');

const child = spawn('ls', ['-la', '/home']);

child.stdout.on('data', (data) => {
  console.log('stdout:', data.toString());
});

child.stderr.on('data', (data) => {
  console.error('stderr:', data.toString());
});

child.on('close', (code) => {
  console.log('Process exited with code:', code);
});

child.on('error', (error) => {
  console.error('Failed to start:', error.message);
});
```

### Spawn Options

```javascript
const { spawn } = require('child_process');

const child = spawn('node', ['server.js'], {
  cwd: '/path/to/project',
  env: { ...process.env, PORT: '3000' },
  detached: false,  // true to run independently of parent
  stdio: 'pipe',    // 'inherit', 'pipe', 'ignore', or array
  shell: false,     // true to run command in shell
});
```

### Shell Commands with spawn

```javascript
const { spawn } = require('child_process');

// Without shell (arguments as array)
const ls = spawn('ls', ['-la']);

// With shell (single command string)
const shellCmd = spawn('ls -la | grep node', {
  shell: true,
});

shellCmd.stdout.on('data', (data) => {
  console.log(data.toString());
});
```

### Streaming Large Data

```javascript
const { spawn } = require('child_process');
const fs = require('fs');

// Pipe large file through gzip
const gzip = spawn('gzip', ['-c']);
const input = fs.createReadStream('large-file.txt');
const output = fs.createWriteStream('large-file.txt.gz');

input.pipe(gzip.stdin);
gzip.stdout.pipe(output);

gzip.on('close', (code) => {
  console.log('Compression complete, exit code:', code);
});
```

## Using fork()

Fork Node.js modules with IPC (Inter-Process Communication):

```javascript
// parent.js
const { fork } = require('child_process');

const worker = fork('./worker.js');

// Send message to worker
worker.send({ task: 'calculate', data: [1, 2, 3, 4, 5] });

// Receive message from worker
worker.on('message', (result) => {
  console.log('Result from worker:', result);
});

worker.on('exit', (code) => {
  console.log('Worker exited with code:', code);
});
```

```javascript
// worker.js
process.on('message', (message) => {
  if (message.task === 'calculate') {
    const sum = message.data.reduce((a, b) => a + b, 0);
    process.send({ sum });
    process.exit(0);
  }
});
```

### CPU-Intensive Task Example

```javascript
// parent.js
const { fork } = require('child_process');
const os = require('os');

const numCPUs = os.cpus().length;
const workers = [];

// Create workers
for (let i = 0; i < numCPUs; i++) {
  workers.push(fork('./heavy-worker.js'));
}

// Distribute work
const tasks = [/* large array of tasks */];

workers.forEach((worker, index) => {
  const chunk = tasks.slice(
    index * Math.ceil(tasks.length / numCPUs),
    (index + 1) * Math.ceil(tasks.length / numCPUs)
  );
  
  worker.send({ chunk });
  
  worker.on('message', (result) => {
    console.log(`Worker ${index} done:`, result);
  });
});
```

## Using execFile()

Execute a file directly (more efficient than exec for programs):

```javascript
const { execFile } = require('child_process');

execFile('node', ['--version'], (error, stdout) => {
  if (error) throw error;
  console.log('Node version:', stdout);
});

// With promisify
const util = require('util');
const execFileAsync = util.promisify(execFile);

async function getNodeVersion() {
  const { stdout } = await execFileAsync('node', ['--version']);
  return stdout.trim();
}
```

## Error Handling

### Common Error Patterns

```javascript
const { exec, spawn } = require('child_process');

// exec error handling
exec('invalid-command', (error, stdout, stderr) => {
  if (error) {
    console.error('Error code:', error.code);
    console.error('Signal:', error.signal);
    console.error('Message:', error.message);
    return;
  }
});

// spawn error handling
const child = spawn('invalid-command');

child.on('error', (error) => {
  if (error.code === 'ENOENT') {
    console.error('Command not found');
  } else {
    console.error('Error:', error.message);
  }
});

child.on('close', (code, signal) => {
  if (code !== 0) {
    console.error(`Process exited with code ${code}`);
  }
  if (signal) {
    console.error(`Process killed with signal ${signal}`);
  }
});
```

### Timeout Handling

```javascript
const { spawn } = require('child_process');

function runWithTimeout(command, args, timeout) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = '';
    let stderr = '';
    
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Process timed out'));
    }, timeout);
    
    child.stdout.on('data', (data) => {
      stdout += data;
    });
    
    child.stderr.on('data', (data) => {
      stderr += data;
    });
    
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Exit code: ${code}\n${stderr}`));
      }
    });
    
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

// Usage
runWithTimeout('sleep', ['10'], 5000)
  .then(result => console.log(result))
  .catch(err => console.error(err.message));
```

## Practical Examples

### Git Commands

```javascript
const { execSync } = require('child_process');

function git(command) {
  return execSync(`git ${command}`, { encoding: 'utf8' }).trim();
}

const branch = git('branch --show-current');
const status = git('status --porcelain');
const lastCommit = git('log -1 --pretty=format:"%h %s"');

console.log(`Branch: ${branch}`);
console.log(`Changes: ${status || 'Clean'}`);
console.log(`Last commit: ${lastCommit}`);
```

### Running npm Scripts

```javascript
const { spawn } = require('child_process');

function npmRun(script, options = {}) {
  return new Promise((resolve, reject) => {
    const npm = spawn('npm', ['run', script], {
      cwd: options.cwd || process.cwd(),
      stdio: 'inherit',
      shell: true,
    });
    
    npm.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm run ${script} failed with code ${code}`));
    });
  });
}

// Usage
await npmRun('build');
await npmRun('test');
```

### Command Runner Utility

```javascript
const { spawn } = require('child_process');

class CommandRunner {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.env = { ...process.env, ...options.env };
  }
  
  run(command, args = []) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: this.cwd,
        env: this.env,
        shell: true,
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data;
        process.stdout.write(data);
      });
      
      child.stderr.on('data', (data) => {
        stderr += data;
        process.stderr.write(data);
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          const error = new Error(`Command failed: ${command}`);
          error.code = code;
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
        }
      });
    });
  }
}

// Usage
const runner = new CommandRunner({ cwd: '/path/to/project' });
await runner.run('npm', ['install']);
await runner.run('npm', ['test']);
```

## Security Considerations

### Avoid Shell Injection

```javascript
const { spawn, exec } = require('child_process');

// DANGEROUS - shell injection vulnerability
const userInput = 'file.txt; rm -rf /';
exec(`cat ${userInput}`, callback);  // DON'T DO THIS

// SAFE - use spawn with arguments
const filename = 'file.txt; rm -rf /';  // Malicious input
spawn('cat', [filename]);  // filename treated as literal argument

// SAFE - escape user input if shell is needed
const { escape } = require('shell-escape');
exec(`cat ${escape(userInput)}`, callback);
```

### Limit Capabilities

```javascript
const { spawn } = require('child_process');

const child = spawn('untrusted-script', [], {
  cwd: '/sandboxed/directory',
  env: {
    PATH: '/usr/bin',  // Limited PATH
    HOME: '/tmp',
  },
  uid: 65534,  // nobody user
  gid: 65534,  // nogroup
});
```

## Summary

| Method | Use Case |
|--------|----------|
| `exec` | Short commands, need full output |
| `execSync` | Blocking commands, scripts |
| `spawn` | Long-running, streaming output |
| `fork` | Node.js IPC, CPU-intensive |
| `execFile` | Direct program execution |

Best practices:
- Use spawn for long-running processes
- Use fork for Node.js worker processes
- Avoid exec with user input (shell injection)
- Always handle errors and exit codes
- Set timeouts for external commands
- Use `stdio: 'inherit'` for interactive commands
