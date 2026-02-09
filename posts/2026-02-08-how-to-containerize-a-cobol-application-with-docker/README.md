# How to Containerize a COBOL Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, COBOL, Containerization, DevOps, Legacy Modernization, Mainframe Migration

Description: How to containerize COBOL applications with Docker using GnuCOBOL, enabling mainframe-to-cloud migration and modernization of legacy systems.

---

COBOL still processes an estimated 95% of ATM transactions and 80% of in-person financial transactions worldwide. Modernizing these systems often starts with containerization, moving COBOL workloads from mainframes to Linux containers without rewriting the business logic. Docker provides a practical path for this migration using GnuCOBOL, an open-source COBOL compiler that runs on Linux. This guide covers containerizing COBOL applications from simple batch programs to interactive web-accessible services.

## Prerequisites

Docker must be installed. COBOL experience is helpful but not required. We use GnuCOBOL (formerly OpenCOBOL), which compiles COBOL source to C and then to native binaries. Understanding of basic file I/O and batch processing concepts will help.

## Creating a Sample COBOL Application

Let's start with a classic COBOL batch program, then build up to a web-accessible service.

Create a simple COBOL program:

```cobol
      *> hello.cob - basic COBOL program for Docker demonstration
       IDENTIFICATION DIVISION.
       PROGRAM-ID. HELLO-DOCKER.
       AUTHOR. DEVELOPER.

       ENVIRONMENT DIVISION.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 WS-DATE        PIC X(8).
       01 WS-TIME        PIC X(8).
       01 WS-RESULT      PIC 9(10)V99.
       01 WS-COUNTER     PIC 9(6) VALUE 0.

       PROCEDURE DIVISION.
       MAIN-PARA.
           DISPLAY "Hello from COBOL in Docker!"
           ACCEPT WS-DATE FROM DATE
           ACCEPT WS-TIME FROM TIME
           DISPLAY "Date: " WS-DATE
           DISPLAY "Time: " WS-TIME

           PERFORM COMPUTE-PARA
           DISPLAY "Computation result: " WS-RESULT

           STOP RUN.

       COMPUTE-PARA.
      *>   Simple computation - sum of squares
           PERFORM VARYING WS-COUNTER FROM 1 BY 1
               UNTIL WS-COUNTER > 1000
               COMPUTE WS-RESULT =
                   WS-RESULT + (WS-COUNTER * WS-COUNTER)
           END-PERFORM.
```

## Basic Dockerfile

```dockerfile
# Dockerfile for COBOL application using GnuCOBOL
FROM ubuntu:22.04

# Install GnuCOBOL compiler
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gnucobol4 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy COBOL source
COPY hello.cob ./

# Compile the COBOL program
# -x: produce an executable
# -free: accept free-format source (not fixed columns)
RUN cobc -x -free -o hello hello.cob

CMD ["./hello"]
```

Build and run:

```bash
# Build the Docker image
docker build -t cobol-app:basic .

# Run the COBOL program
docker run --rm cobol-app:basic
```

## Multi-Stage Build

```dockerfile
# Stage 1: Compile the COBOL program
FROM ubuntu:22.04 AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gnucobol4 gcc libc6-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY *.cob ./

# Compile to executable with optimizations
RUN cobc -x -free -O2 -o app hello.cob

# Stage 2: Runtime with only necessary libraries
FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libcob4 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/app /app/app

RUN useradd -m -r coboluser
USER coboluser

CMD ["/app/app"]
```

The runtime image only needs `libcob4`, the GnuCOBOL runtime library. The compiler and development headers stay in the builder stage.

## COBOL with File Processing

Most real COBOL programs process files. Here is a batch processing example:

```cobol
      *> process-records.cob - batch file processing program
       IDENTIFICATION DIVISION.
       PROGRAM-ID. PROCESS-RECORDS.

       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT INPUT-FILE ASSIGN TO "/data/input/records.dat"
               ORGANIZATION IS LINE SEQUENTIAL
               FILE STATUS IS WS-FILE-STATUS.
           SELECT OUTPUT-FILE ASSIGN TO "/data/output/results.dat"
               ORGANIZATION IS LINE SEQUENTIAL.

       DATA DIVISION.
       FILE SECTION.
       FD INPUT-FILE.
       01 INPUT-RECORD.
           05 IR-ID          PIC X(10).
           05 IR-NAME        PIC X(30).
           05 IR-AMOUNT      PIC 9(8)V99.

       FD OUTPUT-FILE.
       01 OUTPUT-RECORD      PIC X(80).

       WORKING-STORAGE SECTION.
       01 WS-FILE-STATUS     PIC XX.
       01 WS-EOF             PIC 9 VALUE 0.
       01 WS-COUNT           PIC 9(6) VALUE 0.
       01 WS-TOTAL           PIC 9(12)V99 VALUE 0.
       01 WS-OUTPUT-LINE     PIC X(80).

       PROCEDURE DIVISION.
       MAIN-PARA.
           OPEN INPUT INPUT-FILE
           OPEN OUTPUT OUTPUT-FILE

           IF WS-FILE-STATUS NOT = "00"
               DISPLAY "Error opening input file: " WS-FILE-STATUS
               STOP RUN
           END-IF

           PERFORM READ-PROCESS-PARA UNTIL WS-EOF = 1

           STRING "Total records: " WS-COUNT
                  " Total amount: " WS-TOTAL
               DELIMITED BY SIZE INTO WS-OUTPUT-LINE
           WRITE OUTPUT-RECORD FROM WS-OUTPUT-LINE
           DISPLAY WS-OUTPUT-LINE

           CLOSE INPUT-FILE
           CLOSE OUTPUT-FILE
           STOP RUN.

       READ-PROCESS-PARA.
           READ INPUT-FILE
               AT END SET WS-EOF TO 1
               NOT AT END
                   ADD 1 TO WS-COUNT
                   ADD IR-AMOUNT TO WS-TOTAL
                   STRING IR-ID " " IR-NAME " " IR-AMOUNT
                       DELIMITED BY SIZE INTO WS-OUTPUT-LINE
                   WRITE OUTPUT-RECORD FROM WS-OUTPUT-LINE
           END-READ.
```

Dockerfile for file processing:

```dockerfile
# Dockerfile for COBOL batch processing
FROM ubuntu:22.04 AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends gnucobol4 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY process-records.cob ./
RUN cobc -x -free -o process-records process-records.cob

FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y --no-install-recommends libcob4 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/process-records /app/process-records

# Create data directories
RUN mkdir -p /data/input /data/output

RUN useradd -m -r coboluser && \
    chown -R coboluser:coboluser /data
USER coboluser

CMD ["/app/process-records"]
```

Run with data volumes:

```bash
# Mount input data and collect output
docker run --rm \
  -v $(pwd)/input:/data/input:ro \
  -v $(pwd)/output:/data/output \
  cobol-batch:latest
```

## Making COBOL Web-Accessible

Wrap your COBOL program with a lightweight web interface using a shell script and netcat, or more practically, a Python Flask wrapper:

```python
# wrapper.py - Python wrapper to expose COBOL programs via HTTP
from flask import Flask, request, jsonify
import subprocess
import os

app = Flask(__name__)

@app.route('/')
def index():
    return 'COBOL Service Running in Docker'

@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'runtime': 'GnuCOBOL'})

@app.route('/process', methods=['POST'])
def process():
    # Write input data to a temp file
    input_data = request.get_data(as_text=True)
    with open('/tmp/input.dat', 'w') as f:
        f.write(input_data)

    # Run the COBOL program
    result = subprocess.run(
        ['/app/process-records'],
        capture_output=True,
        text=True,
        env={**os.environ, 'COB_FILE_PATH': '/tmp'}
    )

    # Read the output
    output = ''
    if os.path.exists('/tmp/results.dat'):
        with open('/tmp/results.dat', 'r') as f:
            output = f.read()

    return jsonify({
        'stdout': result.stdout,
        'stderr': result.stderr,
        'output': output,
        'returncode': result.returncode
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
```

Combined Dockerfile:

```dockerfile
# Dockerfile for COBOL with Python web wrapper
FROM ubuntu:22.04 AS cobol-builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends gnucobol4 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY *.cob ./
RUN cobc -x -free -o process-records process-records.cob

FROM python:3.12-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends libcob4 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir flask gunicorn

WORKDIR /app

COPY --from=cobol-builder /app/process-records /app/process-records
COPY wrapper.py /app/

RUN mkdir -p /tmp && useradd -m -r coboluser
USER coboluser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

CMD ["gunicorn", "-b", "0.0.0.0:8080", "-w", "4", "wrapper:app"]
```

## The .dockerignore File

```text
# .dockerignore
.git/
*.o
output/
README.md
Dockerfile
docker-compose.yml
```

## Docker Compose for a COBOL Microservice

```yaml
# docker-compose.yml - COBOL service with supporting infrastructure
version: "3.8"
services:
  cobol-service:
    build:
      context: .
    ports:
      - "8080:8080"
    volumes:
      - ./data/input:/data/input:ro
      - ./data/output:/data/output
    environment:
      - PORT=8080
      - COB_FILE_PATH=/data

  # Queue for batch job triggering
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # Database for storing processing results
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: cobol
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: cobol_results
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

## COBOL Compiler Options

GnuCOBOL has several compilation options relevant to Docker:

```bash
# Common GnuCOBOL compilation flags
cobc -x -free hello.cob          # Compile free-format source to executable
cobc -x -fixed hello.cob         # Compile fixed-format source (traditional)
cobc -x -O2 hello.cob            # Optimize for speed
cobc -x -debug hello.cob         # Include debug information
cobc -x -Wall hello.cob          # Enable all warnings
cobc -x -std=cobol2014 hello.cob # Use COBOL 2014 standard
```

For production Docker builds, always use `-O2` and avoid `-debug`:

```dockerfile
RUN cobc -x -free -O2 -o app program.cob
```

## Handling COBOL Copybooks

COBOL programs often use copybooks (shared record definitions). Include them in your Docker build:

```dockerfile
# Copy copybooks (shared COBOL includes)
COPY copybooks/ /app/copybooks/

# Set the COBOL copy path
ENV COBCPY=/app/copybooks

# Compile with copybook path
RUN cobc -x -free -I /app/copybooks -o app program.cob
```

## Testing COBOL Programs in Docker

```bash
# Run a quick test of the COBOL program
docker run --rm cobol-app:latest /app/hello

# Run with test input data
echo "0000000001John Doe                      0000010000" | \
  docker run --rm -i -v /dev/stdin:/data/input/records.dat cobol-batch:latest
```

## Monitoring Legacy COBOL Services

Modernized COBOL services running in Docker need proper monitoring. [OneUptime](https://oneuptime.com) can monitor the web wrapper's `/health` endpoint and track processing times for batch jobs. This gives your operations team visibility into COBOL workloads that were previously opaque on mainframes.

## Summary

Containerizing COBOL applications with Docker and GnuCOBOL provides a practical modernization path. Legacy business logic remains untouched while the deployment model moves from mainframe to containers. Multi-stage builds keep images lean by separating the compiler from the runtime. Python or other web frameworks can wrap COBOL programs as HTTP services, making them accessible to modern microservice architectures. For organizations with decades of COBOL code, this approach offers incremental modernization without the risks of a full rewrite.
