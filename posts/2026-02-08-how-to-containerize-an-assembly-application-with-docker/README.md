# How to Containerize an Assembly Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Assembly, Containerization, DevOps, Low-Level Programming, Systems Programming

Description: How to containerize x86-64 assembly applications with Docker, including NASM assembly, static linking, and creating ultra-minimal container images.

---

Assembly language gives you direct control over the CPU. While most developers never need to write it, certain performance-critical code paths, bootloaders, embedded systems interfaces, and educational projects benefit from assembly. Docker provides a consistent build environment for assembly projects, eliminating the "works on my machine" problem that plagues low-level development. This guide covers containerizing x86-64 assembly applications using NASM.

## Prerequisites

Docker must be installed. Basic understanding of x86-64 assembly and Linux system calls helps. We will work with NASM (Netwide Assembler) syntax, which is the most common for Linux assembly.

## Creating a Sample Assembly Application

Let's build an HTTP server in pure x86-64 assembly. Yes, it is possible and surprisingly instructive.

Create the project:

```bash
mkdir asm-docker-demo
cd asm-docker-demo
```

Create a simpler starting point first, a program that writes an HTTP response to stdout:

```nasm
; hello.asm - simple "Hello World" using Linux syscalls
; Assembles for x86-64 Linux

section .data
    ; HTTP response as a static string
    response db "HTTP/1.1 200 OK", 13, 10
             db "Content-Type: text/plain", 13, 10
             db "Content-Length: 28", 13, 10
             db 13, 10
             db "Hello from Assembly in Docker!"
    response_len equ $ - response

    ; Message for stdout
    msg db "Assembly server starting...", 10
    msg_len equ $ - msg

section .text
    global _start

_start:
    ; Write startup message to stdout
    mov rax, 1          ; syscall: write
    mov rdi, 1          ; file descriptor: stdout
    mov rsi, msg        ; buffer address
    mov rdx, msg_len    ; buffer length
    syscall

    ; Create a socket (AF_INET=2, SOCK_STREAM=1, IPPROTO_TCP=6)
    mov rax, 41         ; syscall: socket
    mov rdi, 2          ; AF_INET
    mov rsi, 1          ; SOCK_STREAM
    mov rdx, 6          ; IPPROTO_TCP
    syscall
    mov r12, rax        ; save socket fd in r12

    ; Set SO_REUSEADDR option
    mov rax, 54         ; syscall: setsockopt
    mov rdi, r12        ; socket fd
    mov rsi, 1          ; SOL_SOCKET
    mov rdx, 2          ; SO_REUSEADDR
    lea r10, [rsp-4]    ; pointer to option value
    mov dword [r10], 1  ; option value = 1
    mov r8, 4           ; option length
    syscall

    ; Bind to 0.0.0.0:8080
    ; sockaddr_in structure on the stack
    sub rsp, 16
    mov word [rsp], 2       ; sin_family = AF_INET
    mov word [rsp+2], 0x901f ; sin_port = 8080 (network byte order)
    mov dword [rsp+4], 0    ; sin_addr = 0.0.0.0 (INADDR_ANY)

    mov rax, 49         ; syscall: bind
    mov rdi, r12        ; socket fd
    mov rsi, rsp        ; pointer to sockaddr
    mov rdx, 16         ; sockaddr length
    syscall

    ; Listen with backlog of 128
    mov rax, 50         ; syscall: listen
    mov rdi, r12        ; socket fd
    mov rsi, 128        ; backlog
    syscall

accept_loop:
    ; Accept incoming connection
    mov rax, 43         ; syscall: accept
    mov rdi, r12        ; socket fd
    xor rsi, rsi        ; NULL (don't need client addr)
    xor rdx, rdx        ; NULL (don't need addr length)
    syscall
    mov r13, rax        ; save client fd in r13

    ; Read the request (we don't actually parse it)
    sub rsp, 1024
    mov rax, 0          ; syscall: read
    mov rdi, r13        ; client fd
    mov rsi, rsp        ; buffer
    mov rdx, 1024       ; max bytes
    syscall
    add rsp, 1024

    ; Write the HTTP response
    mov rax, 1          ; syscall: write
    mov rdi, r13        ; client fd
    mov rsi, response   ; response buffer
    mov rdx, response_len ; response length
    syscall

    ; Close client connection
    mov rax, 3          ; syscall: close
    mov rdi, r13        ; client fd
    syscall

    ; Loop back to accept the next connection
    jmp accept_loop
```

## Basic Dockerfile

```dockerfile
# Dockerfile for x86-64 assembly application
FROM ubuntu:22.04 AS builder

# Install NASM assembler and linker
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    nasm binutils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy assembly source
COPY hello.asm ./

# Assemble and link
# -f elf64: output 64-bit ELF object file
# -static: create a statically linked binary
# -nostdlib: don't link against libc
RUN nasm -f elf64 hello.asm -o hello.o && \
    ld -static -nostdlib hello.o -o server

# Verify the binary
RUN file server

FROM scratch

COPY --from=builder /app/server /server

EXPOSE 8080
CMD ["/server"]
```

This creates what might be the smallest functional Docker image you will ever see. The binary is typically under 2 KB, and the total image size is under 10 KB.

## Understanding the Build Process

The assembly build has two steps:

1. **Assembly**: NASM converts `.asm` source to an object file (`.o`) containing machine code
2. **Linking**: `ld` combines object files into an executable, resolving symbols and setting up the ELF header

```bash
# Step-by-step build process
nasm -f elf64 hello.asm -o hello.o   # Assemble to 64-bit ELF object
ld -static -nostdlib hello.o -o server # Link into static executable
```

The `-nostdlib` flag means we are not linking against the C standard library. Our program talks directly to the Linux kernel through syscalls. This is what makes the binary so small.

## Adding Health Check Support

Let's extend the server to handle different paths:

```nasm
; server.asm - HTTP server with basic routing
; Handles / and /health endpoints

section .data
    ; Response for root path
    root_response db "HTTP/1.1 200 OK", 13, 10
                  db "Content-Type: text/plain", 13, 10
                  db "Content-Length: 30", 13, 10
                  db 13, 10
                  db "Hello from Assembly in Docker!", 10
    root_response_len equ $ - root_response

    ; Response for health check
    health_response db "HTTP/1.1 200 OK", 13, 10
                    db "Content-Type: application/json", 13, 10
                    db "Content-Length: 39", 13, 10
                    db 13, 10
                    db '{"status":"ok","language":"x86-64 ASM"}'
    health_response_len equ $ - health_response

    ; 404 response
    notfound_response db "HTTP/1.1 404 Not Found", 13, 10
                      db "Content-Length: 9", 13, 10
                      db 13, 10
                      db "Not Found"
    notfound_response_len equ $ - notfound_response

    ; Path patterns to match
    health_path db "GET /health"
    health_path_len equ $ - health_path

    root_path db "GET / "
    root_path_len equ $ - root_path

    startup_msg db "Assembly HTTP server listening on port 8080", 10
    startup_msg_len equ $ - startup_msg

section .bss
    request_buf resb 4096

section .text
    global _start

; String comparison: rsi=str1, rdi=str2, rcx=length
; Returns: ZF set if equal
str_prefix_match:
    push rcx
    repe cmpsb
    pop rcx
    ret

_start:
    ; Print startup message
    mov rax, 1
    mov rdi, 1
    mov rsi, startup_msg
    mov rdx, startup_msg_len
    syscall

    ; Create socket
    mov rax, 41
    mov rdi, 2
    mov rsi, 1
    mov rdx, 6
    syscall
    mov r12, rax

    ; Set SO_REUSEADDR
    sub rsp, 4
    mov dword [rsp], 1
    mov rax, 54
    mov rdi, r12
    mov rsi, 1
    mov rdx, 2
    lea r10, [rsp]
    mov r8, 4
    syscall
    add rsp, 4

    ; Bind to port 8080
    sub rsp, 16
    mov word [rsp], 2
    mov word [rsp+2], 0x901f
    mov dword [rsp+4], 0
    mov rax, 49
    mov rdi, r12
    mov rsi, rsp
    mov rdx, 16
    syscall

    ; Listen
    mov rax, 50
    mov rdi, r12
    mov rsi, 128
    syscall

.accept_loop:
    mov rax, 43
    mov rdi, r12
    xor rsi, rsi
    xor rdx, rdx
    syscall
    mov r13, rax

    ; Read request
    mov rax, 0
    mov rdi, r13
    lea rsi, [request_buf]
    mov rdx, 4096
    syscall

    ; Check for /health path
    lea rsi, [request_buf]
    lea rdi, [health_path]
    mov rcx, health_path_len
    call str_prefix_match
    je .send_health

    ; Check for root path
    lea rsi, [request_buf]
    lea rdi, [root_path]
    mov rcx, root_path_len
    call str_prefix_match
    je .send_root

    ; Default: 404
    mov rsi, notfound_response
    mov rdx, notfound_response_len
    jmp .send_response

.send_health:
    mov rsi, health_response
    mov rdx, health_response_len
    jmp .send_response

.send_root:
    mov rsi, root_response
    mov rdx, root_response_len

.send_response:
    mov rax, 1
    mov rdi, r13
    syscall

    ; Close client connection
    mov rax, 3
    mov rdi, r13
    syscall

    jmp .accept_loop
```

## The .dockerignore File

```text
# .dockerignore
.git/
*.o
server
README.md
```

## Makefile for Local Development

Create a Makefile to simplify the build:

```makefile
# Makefile - build commands for the assembly project
ASM = nasm
LD = ld
ASMFLAGS = -f elf64
LDFLAGS = -static -nostdlib

all: server

# Assemble the source file
server.o: server.asm
	$(ASM) $(ASMFLAGS) server.asm -o server.o

# Link the object file into an executable
server: server.o
	$(LD) $(LDFLAGS) server.o -o server

clean:
	rm -f *.o server

.PHONY: all clean
```

## Image Size Analysis

Assembly Docker images are extraordinarily small:

| Component | Size |
|-----------|------|
| Assembly binary | ~2-4 KB |
| Docker image (scratch) | ~10 KB |
| Compared to Alpine | ~7 MB |
| Compared to Ubuntu | ~78 MB |

This is thousands of times smaller than a typical application container.

## Using Assembly with C Libraries

For more practical applications, you can link assembly with the C standard library:

```dockerfile
# Assembly with libc for more functionality
FROM ubuntu:22.04 AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends nasm gcc libc6-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY server.asm ./

# Assemble as position-independent code for libc linking
RUN nasm -f elf64 server.asm -o server.o

# Link with gcc to get libc support
RUN gcc -static -o server server.o -lc -nostartfiles

FROM scratch
COPY --from=builder /app/server /server
EXPOSE 8080
CMD ["/server"]
```

## Multi-Architecture Considerations

Assembly is inherently architecture-specific. For multi-arch support, you need separate source files:

```dockerfile
# Build for the target architecture
FROM ubuntu:22.04 AS builder

ARG TARGETARCH

RUN apt-get update && \
    apt-get install -y --no-install-recommends nasm binutils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy architecture-specific source
COPY src/${TARGETARCH}/ ./

RUN nasm -f elf64 server.asm -o server.o && \
    ld -static -nostdlib server.o -o server

FROM scratch
COPY --from=builder /app/server /server
EXPOSE 8080
CMD ["/server"]
```

This expects different assembly source directories for each architecture (amd64, arm64, etc.).

## Debugging Assembly in Docker

Debugging assembly in containers requires GDB:

```dockerfile
# Debug image with GDB support
FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y nasm binutils gdb strace \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Build with debug symbols
RUN nasm -f elf64 -g -F dwarf server.asm -o server.o && \
    ld -static -nostdlib server.o -o server

CMD ["gdb", "./server"]
```

Run with:

```bash
# Run the debug container interactively
docker run -it --cap-add=SYS_PTRACE asm-debug:latest
```

The `--cap-add=SYS_PTRACE` flag is required for GDB to attach to processes inside the container.

## Monitoring

Even bare-metal assembly servers need monitoring in production. [OneUptime](https://oneuptime.com) can hit the `/health` endpoint to verify your assembly server is responding correctly. Since assembly servers have no garbage collector and no runtime overhead, their response times are the most predictable of any language, so any deviation from baseline performance signals a real infrastructure issue.

## Summary

Containerizing assembly applications produces the smallest possible Docker images, often under 10 KB. The pattern is simple: use NASM and ld in the builder stage, copy the static binary to scratch. The resulting container has no shell, no libraries, and no attack surface beyond the binary itself. While most production applications are better served by higher-level languages, assembly containers demonstrate Docker's flexibility and provide the ultimate baseline for understanding what containers really are: isolated Linux processes running a single binary.
