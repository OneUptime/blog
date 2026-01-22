# How to Use Axios for HTTP Requests in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Axios, HTTP, API, REST

Description: Learn how to use Axios for making HTTP requests in Node.js including GET, POST, error handling, interceptors, and best practices.

---

Axios is a popular HTTP client for Node.js and browsers. It provides a clean API for making HTTP requests with features like automatic JSON transformation, request cancellation, and interceptors.

## Installation

```bash
npm install axios
```

## Basic Requests

### GET Request

```javascript
const axios = require('axios');

// Simple GET
const response = await axios.get('https://api.example.com/users');
console.log(response.data);

// With query parameters
const response = await axios.get('https://api.example.com/users', {
  params: {
    page: 1,
    limit: 10,
    sort: 'name',
  },
});

// URL: https://api.example.com/users?page=1&limit=10&sort=name
```

### POST Request

```javascript
// POST with JSON body
const response = await axios.post('https://api.example.com/users', {
  name: 'John Doe',
  email: 'john@example.com',
});

// POST with form data
const FormData = require('form-data');
const form = new FormData();
form.append('name', 'John');
form.append('file', fs.createReadStream('/path/to/file'));

const response = await axios.post('https://api.example.com/upload', form, {
  headers: form.getHeaders(),
});
```

### Other HTTP Methods

```javascript
// PUT
await axios.put('https://api.example.com/users/1', {
  name: 'Updated Name',
});

// PATCH
await axios.patch('https://api.example.com/users/1', {
  email: 'new@example.com',
});

// DELETE
await axios.delete('https://api.example.com/users/1');

// HEAD
const response = await axios.head('https://api.example.com/users');
console.log(response.headers);

// OPTIONS
const response = await axios.options('https://api.example.com/users');
```

## Response Structure

```javascript
const response = await axios.get('https://api.example.com/data');

console.log(response.data);       // Response body
console.log(response.status);     // HTTP status code
console.log(response.statusText); // Status message
console.log(response.headers);    // Response headers
console.log(response.config);     // Request configuration
```

## Creating an Instance

Create configured instances for different APIs:

```javascript
const axios = require('axios');

// Create instance with defaults
const apiClient = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Use the instance
const users = await apiClient.get('/users');
const user = await apiClient.post('/users', { name: 'John' });

// Multiple instances for different services
const userService = axios.create({
  baseURL: 'https://users.api.example.com',
});

const orderService = axios.create({
  baseURL: 'https://orders.api.example.com',
});
```

## Request Configuration

```javascript
const config = {
  // URL and method
  url: '/users',
  method: 'post',
  baseURL: 'https://api.example.com',
  
  // Headers
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json',
  },
  
  // Data
  data: { name: 'John' },
  params: { page: 1 },
  
  // Timeout
  timeout: 10000,
  
  // Response type
  responseType: 'json',  // 'arraybuffer', 'blob', 'document', 'text', 'stream'
  
  // Authentication
  auth: {
    username: 'user',
    password: 'pass',
  },
  
  // Proxy
  proxy: {
    host: '127.0.0.1',
    port: 8080,
    auth: {
      username: 'proxy-user',
      password: 'proxy-pass',
    },
  },
  
  // Cancel token
  cancelToken: source.token,
  
  // Upload/Download progress
  onUploadProgress: (progressEvent) => {
    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
    console.log(`Upload: ${percent}%`);
  },
  onDownloadProgress: (progressEvent) => {
    console.log(`Downloaded: ${progressEvent.loaded} bytes`);
  },
  
  // Validate status
  validateStatus: (status) => {
    return status >= 200 && status < 500;
  },
  
  // Max redirects
  maxRedirects: 5,
  
  // Max content length
  maxContentLength: 10 * 1024 * 1024,  // 10MB
  maxBodyLength: 10 * 1024 * 1024,
};

const response = await axios(config);
```

## Error Handling

```javascript
try {
  const response = await axios.get('https://api.example.com/data');
  return response.data;
} catch (error) {
  if (error.response) {
    // Server responded with error status (4xx, 5xx)
    console.error('Status:', error.response.status);
    console.error('Data:', error.response.data);
    console.error('Headers:', error.response.headers);
  } else if (error.request) {
    // Request made but no response received
    console.error('No response:', error.request);
  } else {
    // Error setting up request
    console.error('Error:', error.message);
  }
  
  // Check error codes
  if (error.code === 'ECONNABORTED') {
    console.error('Request timed out');
  } else if (error.code === 'ENOTFOUND') {
    console.error('Server not found');
  } else if (error.code === 'ECONNREFUSED') {
    console.error('Connection refused');
  }
  
  throw error;
}
```

### Custom Error Handler

```javascript
function handleAxiosError(error) {
  const errorResponse = {
    message: 'An error occurred',
    status: null,
    data: null,
    code: error.code,
  };
  
  if (error.response) {
    errorResponse.status = error.response.status;
    errorResponse.data = error.response.data;
    
    switch (error.response.status) {
      case 400:
        errorResponse.message = 'Bad request';
        break;
      case 401:
        errorResponse.message = 'Unauthorized';
        break;
      case 403:
        errorResponse.message = 'Forbidden';
        break;
      case 404:
        errorResponse.message = 'Not found';
        break;
      case 429:
        errorResponse.message = 'Too many requests';
        break;
      case 500:
        errorResponse.message = 'Internal server error';
        break;
      default:
        errorResponse.message = error.response.data?.message || 'Request failed';
    }
  } else if (error.request) {
    errorResponse.message = 'No response from server';
  } else {
    errorResponse.message = error.message;
  }
  
  return errorResponse;
}
```

## Interceptors

### Request Interceptor

```javascript
// Add auth token to all requests
axios.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request timestamp
    config.metadata = { startTime: Date.now() };
    
    console.log(`Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

### Response Interceptor

```javascript
axios.interceptors.response.use(
  (response) => {
    // Log response time
    const duration = Date.now() - response.config.metadata.startTime;
    console.log(`Response: ${response.status} (${duration}ms)`);
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const newToken = await refreshToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // Redirect to login
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

### Remove Interceptor

```javascript
const interceptorId = axios.interceptors.request.use(config => config);
axios.interceptors.request.eject(interceptorId);
```

## Request Cancellation

### Using AbortController

```javascript
const controller = new AbortController();

// Make request with cancel token
axios.get('https://api.example.com/data', {
  signal: controller.signal,
}).then(response => {
  console.log(response.data);
}).catch(error => {
  if (axios.isCancel(error)) {
    console.log('Request canceled:', error.message);
  }
});

// Cancel the request
controller.abort();
```

### Cancel Token (Legacy)

```javascript
const CancelToken = axios.CancelToken;
const source = CancelToken.source();

axios.get('https://api.example.com/data', {
  cancelToken: source.token,
}).catch(error => {
  if (axios.isCancel(error)) {
    console.log('Canceled');
  }
});

// Cancel request
source.cancel('Operation canceled by user');
```

### Timeout with Cancellation

```javascript
async function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await axios.get(url, {
      signal: controller.signal,
    });
    return response.data;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

## Retry Logic

```javascript
async function axiosWithRetry(config, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await axios(config);
    } catch (error) {
      lastError = error;
      
      // Don't retry for certain errors
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`Retry attempt ${attempt + 1}/${maxRetries}`);
    }
  }
  
  throw lastError;
}

// Usage
const response = await axiosWithRetry({
  method: 'get',
  url: 'https://api.example.com/data',
  timeout: 5000,
}, 3);
```

### Using axios-retry

```bash
npm install axios-retry
```

```javascript
const axios = require('axios');
const axiosRetry = require('axios-retry');

axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           error.response?.status === 429;
  },
  onRetry: (retryCount, error) => {
    console.log(`Retry attempt ${retryCount}`);
  },
});
```

## Parallel Requests

```javascript
// Using Promise.all
const [users, posts, comments] = await Promise.all([
  axios.get('/users'),
  axios.get('/posts'),
  axios.get('/comments'),
]);

// Using axios.all (deprecated but still works)
const results = await axios.all([
  axios.get('/users'),
  axios.get('/posts'),
]);

// Using Promise.allSettled for fault tolerance
const results = await Promise.allSettled([
  axios.get('/users'),
  axios.get('/posts'),
  axios.get('/comments'),
]);

results.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    console.log(`Request ${index} succeeded:`, result.value.data);
  } else {
    console.log(`Request ${index} failed:`, result.reason.message);
  }
});
```

## File Download

```javascript
const fs = require('fs');
const axios = require('axios');

async function downloadFile(url, outputPath) {
  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream',
  });
  
  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

// With progress
async function downloadWithProgress(url, outputPath) {
  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream',
    onDownloadProgress: (progress) => {
      if (progress.total) {
        const percent = Math.round((progress.loaded / progress.total) * 100);
        process.stdout.write(`\rDownloading: ${percent}%`);
      }
    },
  });
  
  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      console.log('\nDownload complete');
      resolve();
    });
    writer.on('error', reject);
  });
}
```

## Complete API Client Example

```javascript
const axios = require('axios');

class ApiClient {
  constructor(baseURL, options = {}) {
    this.client = axios.create({
      baseURL,
      timeout: options.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    this.setupInterceptors();
  }
  
  setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        config.metadata = { startTime: Date.now() };
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - response.config.metadata.startTime;
        console.log(`${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status} (${duration}ms)`);
        return response;
      },
      (error) => {
        console.error(`Request failed: ${error.message}`);
        return Promise.reject(this.handleError(error));
      }
    );
  }
  
  setAuthToken(token) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  
  handleError(error) {
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.data?.message || 'Request failed',
        data: error.response.data,
      };
    }
    return {
      status: null,
      message: error.message,
      data: null,
    };
  }
  
  async get(url, config) {
    const response = await this.client.get(url, config);
    return response.data;
  }
  
  async post(url, data, config) {
    const response = await this.client.post(url, data, config);
    return response.data;
  }
  
  async put(url, data, config) {
    const response = await this.client.put(url, data, config);
    return response.data;
  }
  
  async delete(url, config) {
    const response = await this.client.delete(url, config);
    return response.data;
  }
}

// Usage
const api = new ApiClient('https://api.example.com');
api.setAuthToken('your-token');

const users = await api.get('/users');
const newUser = await api.post('/users', { name: 'John' });
```

## Summary

| Method | Usage |
|--------|-------|
| `axios.get()` | GET request |
| `axios.post()` | POST request |
| `axios.put()` | PUT request |
| `axios.patch()` | PATCH request |
| `axios.delete()` | DELETE request |
| `axios.create()` | Create instance |

| Config Option | Description |
|---------------|-------------|
| `baseURL` | Base URL for requests |
| `timeout` | Request timeout in ms |
| `headers` | Custom headers |
| `params` | URL query parameters |
| `data` | Request body |
| `responseType` | Expected response type |

| Feature | Description |
|---------|-------------|
| Interceptors | Modify requests/responses |
| Cancel tokens | Cancel pending requests |
| Transform | Transform request/response data |
| Retry | Retry failed requests |
