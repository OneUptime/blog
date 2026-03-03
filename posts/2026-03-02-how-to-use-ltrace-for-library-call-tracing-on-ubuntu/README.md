# How to Use ltrace for Library Call Tracing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ltrace, Debugging, Tracing, System Administration

Description: Learn how to use ltrace on Ubuntu to trace library calls made by applications, identify bottlenecks, and debug library-level behavior including cryptography and network functions.

---

`ltrace` is a tracing utility that intercepts and records dynamic library function calls made by a running process. While `strace` shows system calls (kernel-level operations), `ltrace` shows calls to shared libraries like libc, OpenSSL, or your own shared libraries. This makes it useful for understanding how an application uses encryption, parses data, makes DNS queries through resolver libraries, or behaves with specific library versions.

## Prerequisites

- Ubuntu 22.04 or newer
- Root or sudo access (required for attaching to existing processes)
- A basic understanding of shared libraries

## Installing ltrace

```bash
# Install ltrace from Ubuntu repositories
sudo apt update
sudo apt install -y ltrace

# Verify installation
ltrace --version
```

## Basic Usage

```bash
# Trace library calls for a new process
ltrace command

# Example: trace ls
ltrace ls /tmp

# Trace an existing process by PID
sudo ltrace -p <PID>

# Save output to a file
ltrace -o /tmp/trace.log command

# Show timestamps
ltrace -t command

# Show time spent in each call (relative time)
ltrace -T command
```

## Understanding ltrace Output

A typical ltrace line looks like:

```text
printf("Hello, World!\n")                        = 14
malloc(1024)                                      = 0x55a7b8e5a260
strlen("some string")                            = 11
open("config.txt", 0, 0)                         = 3
fgets(0x7fff5e3d2a20, 256, 0x7f8a3c001e80)       = 0x7fff5e3d2a20
```

The format is:
```text
function_name(arguments)  = return_value
```

## Filtering Library Calls

Most programs make hundreds of library calls. Use `-e` to filter:

```bash
# Show only specific functions
ltrace -e malloc,free,realloc ls /tmp

# Show calls matching a pattern (using globbing)
ltrace -e "*crypt*" openssl enc -aes-256-cbc -e -in file.txt

# Show only string functions
ltrace -e "str*,mem*" python3 -c "print('hello')"

# Exclude certain functions (prepend !)
ltrace -e '!malloc,!free,!realloc' curl https://example.com
```

## Tracing Network Library Calls

Many network operations happen via library functions before they become system calls:

```bash
# Trace DNS resolution via glibc resolver
ltrace -e getaddrinfo,getnameinfo,res_query curl https://example.com 2>&1 | head -30

# Trace OpenSSL SSL functions during HTTPS
ltrace -e "SSL*,TLS*,ssl*" curl https://example.com 2>&1 | head -50

# Show what connection functions are called
ltrace -e connect,getaddrinfo,gethostbyname curl https://example.com 2>&1
```

### Example: Tracing an HTTPS Connection

```bash
ltrace -e SSL_connect,SSL_write,SSL_read,getaddrinfo \
  curl https://httpbin.org/get 2>&1

# Output shows:
# getaddrinfo("httpbin.org", "443", {...}, 0x7fff...) = 0
# SSL_connect(0x55f8e2c5b230, ...) = 1
# SSL_write(0x55f8e2c5b230, "GET /get HTTP/1.1\r\n...", 89) = 89
# SSL_read(0x55f8e2c5b230, "HTTP/1.1 200 OK\r\n...", 16384) = 1024
```

## Profiling Library Call Frequency

Find out which library functions are called most often:

```bash
# Count calls to each function
ltrace -c command

# Example output for 'ls':
# % time     seconds  usecs/call     calls      function
# -------  ---------  -----------  --------  --------------------
#  34.12    0.000412           20        20  __ctype_get_mb_cur_max
#  18.43    0.000222           11        20  strlen
#  12.34    0.000149           74         2  opendir
#  ...

# Sort output by call count
ltrace -c curl https://example.com 2>&1 | sort -k4 -rn | head -20
```

## Tracing Shared Library Loading

Find out what libraries an application loads and how it initializes them:

```bash
# Show library loading with -l flag (trace all dynamic linker activity)
ltrace -l '*.so*' command

# Trace dlopen (dynamic library loading at runtime)
ltrace -e dlopen,dlsym,dlclose python3 -c "import ssl"

# Show which .so files are opened
strace -e openat python3 -c "import ssl" 2>&1 | grep "\.so"
# Use strace here as ltrace doesn't intercept raw file opens
```

## Practical Debugging Scenarios

### Debugging Configuration File Parsing

Find out where an application is looking for its config:

```bash
# Trace file-related library calls
ltrace -e fopen,fclose,fgets,fread,open nginx 2>&1 | grep -E "fopen|open"

# Example output:
# fopen("/etc/nginx/nginx.conf", "r") = 0x...
# fopen("/etc/ssl/openssl.cnf", "r") = 0x...
```

### Debugging Cryptography Issues

When an application fails with crypto errors, trace the OpenSSL calls:

```bash
# Trace OpenSSL function calls
ltrace -e "EVP_*,RSA_*,X509_*,SSL_*,ERR_*" \
  openssl s_client -connect example.com:443 2>&1 | head -50

# Look for error codes being set
ltrace -e "ERR_put_error,ERR_get_error" \
  openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt cert.pem 2>&1
```

### Tracing Memory Allocation Patterns

Identify memory allocation issues or leaks at the library level:

```bash
# Trace all memory allocation calls
ltrace -e "malloc,calloc,realloc,free,mmap,munmap" \
  -o /tmp/memory-trace.log \
  your-application

# Count allocations vs frees
grep -c "= malloc\|= calloc\|= realloc" /tmp/memory-trace.log
grep -c "^free(" /tmp/memory-trace.log
# If allocs >> frees, investigate potential memory leak

# Show large allocations
grep "malloc(" /tmp/memory-trace.log | \
  grep -oP "malloc\(\K[0-9]+" | \
  sort -rn | head -20
```

### Tracing String Operations in Parsers

When debugging an application that parses data:

```bash
# Trace string comparison functions (useful for detecting what a process checks)
ltrace -e "strcmp,strncmp,strcasecmp,strstr,memcmp" \
  your-app --config myconfig.json 2>&1

# This can reveal:
# strcmp("config_key", "expected_key") = 0
# - showing exactly which config keys the app is checking
```

## Attaching to Running Processes

For services you cannot restart:

```bash
# Find the PID
pidof apache2
# or
pgrep httpd

# Attach to the main process (use -f to also trace children)
sudo ltrace -p <PID> -e "SSL_*,getaddrinfo" -o /tmp/apache-trace.log &

# Wait for some activity, then kill the trace
kill %1

# Review the trace
cat /tmp/apache-trace.log
```

## Tracing C++ Applications

C++ mangles function names. ltrace shows the mangled names:

```bash
# Trace a C++ application
ltrace ./my_cpp_app 2>&1 | head -20

# To demangle C++ names, pipe through c++filt
ltrace ./my_cpp_app 2>&1 | c++filt | head -20

# Or use the -C flag (demangling, if supported)
ltrace -C ./my_cpp_app 2>&1 | head -20
```

## Writing ltrace Configuration Files

ltrace uses configuration files to know how to decode function arguments. You can write custom configs:

```bash
# Create a custom ltrace config for a library
cat > /tmp/mylib.conf <<'EOF'
; Describe the arguments to your custom library functions
; Format: return_type function_name(arg_types)
void my_send_data(string, int);
int my_parse_config(file, string);
EOF

ltrace --config /tmp/mylib.conf -e my_send_data,my_parse_config ./myapp
```

## Common Limitations

```bash
# ltrace does not work well with:
# - Statically linked binaries (no dynamic library calls to trace)
# - Stripped binaries (function names may not be visible)
# - Go binaries (Go links its own runtime statically)
# - Some security-sensitive applications that detect tracing

# Check if a binary is dynamically linked
file /usr/bin/curl
# Expected: ELF 64-bit LSB pie executable ... dynamically linked

# List what libraries a binary uses
ldd /usr/bin/curl

# For statically linked binaries, use strace instead
file /usr/local/bin/hugo
# ELF 64-bit LSB executable ... statically linked
# Use: sudo strace -p <PID> or strace ./hugo for this
```

## Comparison: ltrace vs strace

```bash
# ltrace - shows library function calls (higher level)
ltrace -e getaddrinfo curl https://example.com 2>&1

# strace - shows kernel system calls (lower level)
strace -e connect curl https://example.com 2>&1

# Both capture network activity, but at different layers:
# ltrace: getaddrinfo("example.com", "https", ...) = 0
# strace: connect(5, {sin_addr=93.184.216.34, sin_port=443}, 16) = 0

# Use ltrace when debugging library API usage or arguments
# Use strace when debugging kernel-level behavior or permission issues
```

## Quick Reference

```bash
# Most useful ltrace invocations for daily debugging:

# What config files is this app opening?
ltrace -e "fopen,open" ./app 2>&1 | grep -v "= -1"

# What encryption is this app using?
ltrace -e "*ssl*,*SSL*,*crypt*" ./app 2>&1

# Why is this app slow? (count and time library calls)
ltrace -c ./app 2>&1 | sort -k2 -rn | head -20

# What strings is this app comparing? (config key matching)
ltrace -e "strcmp,strncmp" ./app 2>&1 | head -40

# All calls to a specific library
ltrace -l libcurl.so* curl https://example.com 2>&1
```

ltrace fills the gap between `strace` (kernel calls) and application-level debugging. It is particularly useful when working with closed-source applications where you cannot read the source code but need to understand their library-level behavior, or when debugging subtle interactions between library versions.
