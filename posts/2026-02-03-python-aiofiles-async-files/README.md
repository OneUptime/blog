# How to Use aiofiles for Async File Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, aiofiles, Async, File I/O, asyncio

Description: Learn how to perform async file operations in Python using aiofiles. This guide covers reading, writing, and managing files asynchronously for better performance.

---

> Blocking file I/O is the silent killer of async Python applications. When your carefully crafted async web server hits a synchronous file read, the entire event loop stalls. This guide shows you how to use aiofiles to keep your async applications truly non-blocking.

Traditional file operations in Python are synchronous - they block the thread until the operation completes. In an async application, this means your event loop stops processing other tasks while waiting for disk I/O. The aiofiles library solves this by running file operations in a thread pool, exposing an async interface that integrates naturally with asyncio.

---

## Why Async File I/O Matters

Consider a simple async web server that reads configuration files:

```python
# The problem: synchronous file I/O in async code
import asyncio

async def handle_request(request):
    # This blocks the entire event loop!
    with open('config.json', 'r') as f:
        config = f.read()

    # Other requests wait while the file is being read
    return process_request(request, config)
```

When `open()` and `f.read()` execute, the event loop cannot process other coroutines. If the file is on a slow disk or network mount, your entire application freezes. With aiofiles, you get:

- Non-blocking file operations that yield control to the event loop
- Familiar file API that feels like standard Python
- Thread pool execution that handles the blocking I/O transparently
- Better throughput when handling multiple concurrent requests

---

## Installation

Install aiofiles using pip:

```bash
pip install aiofiles
```

Or with Poetry:

```bash
poetry add aiofiles
```

For type hints support (recommended for larger projects):

```bash
pip install aiofiles types-aiofiles
```

Verify the installation:

```python
# verify_install.py
# Quick check that aiofiles is installed and working
import asyncio
import aiofiles

async def check_installation():
    """Verify aiofiles is properly installed"""
    # Create a test file asynchronously
    async with aiofiles.open('test_install.txt', 'w') as f:
        await f.write('aiofiles is working!')

    # Read it back to confirm
    async with aiofiles.open('test_install.txt', 'r') as f:
        content = await f.read()
        print(f"Installation verified: {content}")

# Run the verification
asyncio.run(check_installation())
```

---

## Basic File Reading

### Reading Entire Files

The simplest way to read a file asynchronously is with `aiofiles.open()` and the async context manager:

```python
# basic_read.py
# Reading files asynchronously with aiofiles
import asyncio
import aiofiles

async def read_entire_file(filepath: str) -> str:
    """
    Read the entire contents of a file asynchronously.

    This is equivalent to the synchronous:
        with open(filepath, 'r') as f:
            return f.read()

    But it doesn't block the event loop while waiting for disk I/O.
    """
    async with aiofiles.open(filepath, 'r') as f:
        # await is required - read() returns a coroutine
        content = await f.read()
    return content

async def main():
    # Read a configuration file without blocking
    config_content = await read_entire_file('config.json')
    print(f"Config loaded: {len(config_content)} bytes")

    # Read multiple files concurrently - much faster than sequential
    files_to_read = ['file1.txt', 'file2.txt', 'file3.txt']

    # Create tasks for all file reads
    tasks = [read_entire_file(f) for f in files_to_read]

    # Execute all reads concurrently
    contents = await asyncio.gather(*tasks)

    for filename, content in zip(files_to_read, contents):
        print(f"{filename}: {len(content)} bytes")

asyncio.run(main())
```

### Reading Files Line by Line

For large files, reading line by line is more memory-efficient:

```python
# line_by_line.py
# Memory-efficient line-by-line file reading
import asyncio
import aiofiles
from typing import AsyncIterator

async def read_lines(filepath: str) -> AsyncIterator[str]:
    """
    Yield lines from a file one at a time.

    This is memory-efficient for large files because only one line
    is held in memory at a time. The async iterator protocol allows
    using 'async for' to iterate over lines.
    """
    async with aiofiles.open(filepath, 'r') as f:
        async for line in f:
            # Each line includes the newline character
            yield line

async def process_log_file(filepath: str):
    """
    Process a log file line by line.

    Useful for parsing large log files without loading
    everything into memory at once.
    """
    line_count = 0
    error_count = 0

    async for line in read_lines(filepath):
        line_count += 1

        # Check for error patterns
        if 'ERROR' in line or 'Exception' in line:
            error_count += 1
            print(f"Line {line_count}: {line.strip()}")

    print(f"Processed {line_count} lines, found {error_count} errors")

async def read_specific_lines(filepath: str, start: int, end: int) -> list[str]:
    """
    Read a specific range of lines from a file.

    Args:
        filepath: Path to the file
        start: Starting line number (1-indexed)
        end: Ending line number (inclusive)

    Returns:
        List of lines in the specified range
    """
    lines = []
    current_line = 0

    async with aiofiles.open(filepath, 'r') as f:
        async for line in f:
            current_line += 1

            # Skip lines before the start
            if current_line < start:
                continue

            # Stop after reaching the end
            if current_line > end:
                break

            lines.append(line.rstrip('\n'))

    return lines

async def main():
    # Process a log file
    await process_log_file('application.log')

    # Read lines 100-110 from a large file
    selected_lines = await read_specific_lines('large_file.txt', 100, 110)
    for i, line in enumerate(selected_lines, start=100):
        print(f"{i}: {line}")

asyncio.run(main())
```

### Reading Binary Files

Binary files require the 'rb' mode:

```python
# binary_read.py
# Reading binary files - images, archives, etc.
import asyncio
import aiofiles
import hashlib
from pathlib import Path

async def read_binary_file(filepath: str) -> bytes:
    """
    Read a binary file and return its contents as bytes.

    Use this for images, PDFs, archives, or any non-text file.
    The 'rb' mode ensures no text encoding/decoding is performed.
    """
    async with aiofiles.open(filepath, 'rb') as f:
        content = await f.read()
    return content

async def calculate_file_hash(filepath: str, algorithm: str = 'sha256') -> str:
    """
    Calculate a hash of a file's contents asynchronously.

    Args:
        filepath: Path to the file
        algorithm: Hash algorithm - sha256, md5, sha1, etc.

    Returns:
        Hexadecimal hash string
    """
    # Read the file in chunks to handle large files
    hash_obj = hashlib.new(algorithm)
    chunk_size = 65536  # 64KB chunks

    async with aiofiles.open(filepath, 'rb') as f:
        while True:
            # Read a chunk at a time
            chunk = await f.read(chunk_size)
            if not chunk:
                break
            hash_obj.update(chunk)

    return hash_obj.hexdigest()

async def read_image_metadata(filepath: str) -> dict:
    """
    Read basic metadata from an image file.

    This reads just the first few bytes to determine file type
    without loading the entire image into memory.
    """
    async with aiofiles.open(filepath, 'rb') as f:
        # Read just the header - enough to identify file type
        header = await f.read(12)

        # Seek to end to get file size
        await f.seek(0, 2)  # 2 = SEEK_END
        file_size = await f.tell()

    # Identify file type by magic bytes
    file_type = 'unknown'
    if header[:8] == b'\x89PNG\r\n\x1a\n':
        file_type = 'PNG'
    elif header[:2] == b'\xff\xd8':
        file_type = 'JPEG'
    elif header[:6] in (b'GIF87a', b'GIF89a'):
        file_type = 'GIF'
    elif header[:4] == b'RIFF' and header[8:12] == b'WEBP':
        file_type = 'WEBP'

    return {
        'path': filepath,
        'type': file_type,
        'size_bytes': file_size
    }

async def main():
    # Read a binary file
    image_data = await read_binary_file('photo.jpg')
    print(f"Image size: {len(image_data)} bytes")

    # Calculate file hash
    file_hash = await calculate_file_hash('document.pdf')
    print(f"PDF hash: {file_hash}")

    # Get image metadata
    metadata = await read_image_metadata('photo.jpg')
    print(f"Image metadata: {metadata}")

asyncio.run(main())
```

---

## Writing Files

### Basic File Writing

Writing files works similarly to reading:

```python
# basic_write.py
# Writing files asynchronously with aiofiles
import asyncio
import aiofiles
import json
from datetime import datetime

async def write_text_file(filepath: str, content: str):
    """
    Write text content to a file asynchronously.

    Creates the file if it doesn't exist, overwrites if it does.
    Uses 'w' mode for write - this truncates existing files.
    """
    async with aiofiles.open(filepath, 'w') as f:
        await f.write(content)

async def write_json_file(filepath: str, data: dict):
    """
    Write a dictionary as JSON to a file.

    The json.dumps() call is synchronous but fast - the actual
    file write is the async part that matters for I/O bound work.
    """
    # Serialize to JSON string
    json_string = json.dumps(data, indent=2)

    # Write asynchronously
    async with aiofiles.open(filepath, 'w') as f:
        await f.write(json_string)

async def write_with_encoding(filepath: str, content: str, encoding: str = 'utf-8'):
    """
    Write a file with a specific text encoding.

    Common encodings:
        - utf-8: Default, handles all Unicode characters
        - latin-1: Western European, single-byte
        - utf-16: Windows Unicode default
    """
    async with aiofiles.open(filepath, 'w', encoding=encoding) as f:
        await f.write(content)

async def main():
    # Write a simple text file
    await write_text_file('output.txt', 'Hello from aiofiles!')

    # Write JSON configuration
    config = {
        'database': {
            'host': 'localhost',
            'port': 5432,
            'name': 'myapp'
        },
        'cache': {
            'enabled': True,
            'ttl_seconds': 3600
        },
        'updated_at': datetime.now().isoformat()
    }
    await write_json_file('config.json', config)

    # Write with specific encoding
    await write_with_encoding('unicode.txt', 'Hello in Japanese: konnichiwa', 'utf-8')

asyncio.run(main())
```

### Appending to Files

Use 'a' mode to add content without overwriting:

```python
# append_file.py
# Appending content to files - useful for logs and data collection
import asyncio
import aiofiles
from datetime import datetime
from typing import Any

async def append_to_file(filepath: str, content: str):
    """
    Append content to a file without overwriting existing data.

    Creates the file if it doesn't exist. Each call adds to the
    end of the file rather than replacing its contents.
    """
    async with aiofiles.open(filepath, 'a') as f:
        await f.write(content)

async def append_log_entry(filepath: str, level: str, message: str):
    """
    Append a timestamped log entry to a file.

    Format: YYYY-MM-DD HH:MM:SS [LEVEL] message
    Each entry is on its own line.
    """
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    log_line = f"{timestamp} [{level.upper()}] {message}\n"

    async with aiofiles.open(filepath, 'a') as f:
        await f.write(log_line)

async def append_csv_row(filepath: str, row: list[Any]):
    """
    Append a row to a CSV file.

    Handles basic CSV escaping - values containing commas
    or quotes are properly escaped.
    """
    # Escape values that contain special characters
    escaped_values = []
    for value in row:
        str_value = str(value)
        if ',' in str_value or '"' in str_value or '\n' in str_value:
            # Escape quotes by doubling them and wrap in quotes
            str_value = '"' + str_value.replace('"', '""') + '"'
        escaped_values.append(str_value)

    line = ','.join(escaped_values) + '\n'

    async with aiofiles.open(filepath, 'a') as f:
        await f.write(line)

class AsyncFileLogger:
    """
    Simple async file logger for application logging.

    This is a basic implementation - for production use,
    consider proper logging frameworks with async support.
    """

    def __init__(self, filepath: str):
        self.filepath = filepath

    async def _write(self, level: str, message: str):
        """Internal method to write log entries"""
        await append_log_entry(self.filepath, level, message)

    async def debug(self, message: str):
        await self._write('DEBUG', message)

    async def info(self, message: str):
        await self._write('INFO', message)

    async def warning(self, message: str):
        await self._write('WARNING', message)

    async def error(self, message: str):
        await self._write('ERROR', message)

async def main():
    # Simple append
    await append_to_file('notes.txt', 'First note\n')
    await append_to_file('notes.txt', 'Second note\n')

    # Use the async logger
    logger = AsyncFileLogger('app.log')
    await logger.info('Application started')
    await logger.debug('Loading configuration')
    await logger.warning('Config file not found, using defaults')

    # Append CSV data
    await append_csv_row('data.csv', ['timestamp', 'user', 'action'])
    await append_csv_row('data.csv', [datetime.now().isoformat(), 'user123', 'login'])
    await append_csv_row('data.csv', [datetime.now().isoformat(), 'user456', 'purchase'])

asyncio.run(main())
```

### Writing Binary Data

For images, archives, and other binary content:

```python
# binary_write.py
# Writing binary files - images, downloads, etc.
import asyncio
import aiofiles
import struct
from typing import Optional

async def write_binary_file(filepath: str, data: bytes):
    """
    Write binary data to a file.

    Use for images, PDFs, executables, or any non-text content.
    The 'wb' mode ensures no text encoding is applied.
    """
    async with aiofiles.open(filepath, 'wb') as f:
        await f.write(data)

async def copy_file_async(source: str, destination: str, chunk_size: int = 65536):
    """
    Copy a file asynchronously using chunked reads and writes.

    This is memory-efficient for large files since only one
    chunk is held in memory at a time.

    Args:
        source: Path to the source file
        destination: Path to the destination file
        chunk_size: Size of chunks to read/write (default 64KB)
    """
    async with aiofiles.open(source, 'rb') as src:
        async with aiofiles.open(destination, 'wb') as dst:
            while True:
                chunk = await src.read(chunk_size)
                if not chunk:
                    break
                await dst.write(chunk)

async def write_with_progress(
    filepath: str,
    data: bytes,
    callback: Optional[callable] = None
):
    """
    Write binary data with progress reporting.

    Args:
        filepath: Path to write to
        data: Binary data to write
        callback: Function called with (bytes_written, total_bytes)
    """
    total_size = len(data)
    chunk_size = 65536
    written = 0

    async with aiofiles.open(filepath, 'wb') as f:
        for i in range(0, total_size, chunk_size):
            chunk = data[i:i + chunk_size]
            await f.write(chunk)
            written += len(chunk)

            if callback:
                callback(written, total_size)

async def create_simple_bmp(filepath: str, width: int, height: int, color: tuple):
    """
    Create a simple BMP image file.

    This demonstrates writing structured binary data with proper
    headers and pixel data. Creates a solid color image.

    Args:
        filepath: Output file path
        width: Image width in pixels
        height: Image height in pixels
        color: RGB tuple (r, g, b) with values 0-255
    """
    # BMP files store rows padded to 4-byte boundaries
    row_size = (width * 3 + 3) & ~3  # Round up to multiple of 4
    pixel_data_size = row_size * height
    file_size = 54 + pixel_data_size  # 54-byte header + pixels

    # Build BMP header
    header = b'BM'  # Signature
    header += struct.pack('<I', file_size)  # File size
    header += b'\x00\x00\x00\x00'  # Reserved
    header += struct.pack('<I', 54)  # Pixel data offset

    # DIB header (BITMAPINFOHEADER)
    header += struct.pack('<I', 40)  # DIB header size
    header += struct.pack('<i', width)  # Width
    header += struct.pack('<i', height)  # Height (positive = bottom-up)
    header += struct.pack('<H', 1)  # Color planes
    header += struct.pack('<H', 24)  # Bits per pixel
    header += struct.pack('<I', 0)  # Compression (none)
    header += struct.pack('<I', pixel_data_size)  # Image size
    header += struct.pack('<i', 2835)  # Horizontal resolution
    header += struct.pack('<i', 2835)  # Vertical resolution
    header += struct.pack('<I', 0)  # Colors in palette
    header += struct.pack('<I', 0)  # Important colors

    # Build pixel data - BGR format, bottom-up
    r, g, b = color
    pixel_row = bytes([b, g, r] * width)  # BGR order
    padding = bytes(row_size - width * 3)  # Pad to 4-byte boundary
    pixel_data = (pixel_row + padding) * height

    # Write the complete BMP file
    async with aiofiles.open(filepath, 'wb') as f:
        await f.write(header + pixel_data)

async def main():
    # Copy a file
    await copy_file_async('source.dat', 'backup.dat')

    # Write with progress
    data = b'x' * 1000000  # 1MB of data

    def progress(written, total):
        percent = (written / total) * 100
        print(f"Progress: {percent:.1f}%")

    await write_with_progress('output.bin', data, progress)

    # Create a simple BMP image - blue 100x100 square
    await create_simple_bmp('blue_square.bmp', 100, 100, (0, 0, 255))
    print("Created blue_square.bmp")

asyncio.run(main())
```

---

## Context Managers and File Handles

### Understanding Async Context Managers

The `async with` statement ensures files are properly closed:

```python
# context_managers.py
# Proper file handle management with async context managers
import asyncio
import aiofiles
from contextlib import asynccontextmanager
from typing import AsyncIterator

async def bad_example():
    """
    DON'T do this - the file might not be closed properly.

    If an exception occurs between open() and close(), the file
    handle leaks. Always use context managers instead.
    """
    f = await aiofiles.open('data.txt', 'r')
    # If this line raises an exception, f.close() never runs
    content = await f.read()
    await f.close()  # This might not execute
    return content

async def good_example():
    """
    DO this - the context manager guarantees file closure.

    Even if an exception occurs inside the 'async with' block,
    the file is automatically closed when exiting the block.
    """
    async with aiofiles.open('data.txt', 'r') as f:
        # File is automatically closed after this block
        content = await f.read()
    return content

@asynccontextmanager
async def open_with_logging(filepath: str, mode: str = 'r') -> AsyncIterator:
    """
    Custom context manager that logs file operations.

    This wraps aiofiles.open() to add logging for debugging
    or monitoring file access patterns in your application.
    """
    print(f"Opening file: {filepath} (mode={mode})")

    f = await aiofiles.open(filepath, mode)
    try:
        yield f
    except Exception as e:
        print(f"Error during file operation: {e}")
        raise
    finally:
        await f.close()
        print(f"Closed file: {filepath}")

@asynccontextmanager
async def atomic_write(filepath: str, mode: str = 'w'):
    """
    Write to a temporary file then rename for atomic updates.

    This prevents partial writes from corrupting the target file.
    If the write fails, the original file remains untouched.
    """
    import os

    # Write to a temporary file first
    temp_path = filepath + '.tmp'

    try:
        f = await aiofiles.open(temp_path, mode)
        try:
            yield f
        finally:
            await f.close()

        # Atomic rename - this is the only operation that
        # can leave the file in an inconsistent state
        os.rename(temp_path, filepath)

    except Exception:
        # Clean up temp file if it exists
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise

async def main():
    # Use the logging wrapper
    async with open_with_logging('example.txt', 'w') as f:
        await f.write('Test content')

    # Use atomic write for important files
    async with atomic_write('config.json', 'w') as f:
        await f.write('{"version": 2}')

    print("Files written successfully")

asyncio.run(main())
```

### Working with Multiple Files

When working with multiple files, you can nest context managers or use AsyncExitStack:

```python
# multiple_files.py
# Handling multiple files simultaneously
import asyncio
import aiofiles
from contextlib import AsyncExitStack
from typing import Dict, List

async def process_multiple_files_nested(input_path: str, output_path: str):
    """
    Process two files with nested context managers.

    Good for simple cases with a fixed number of files.
    Both files are properly closed even if an error occurs.
    """
    async with aiofiles.open(input_path, 'r') as input_file:
        async with aiofiles.open(output_path, 'w') as output_file:
            async for line in input_file:
                # Transform each line (example: uppercase)
                await output_file.write(line.upper())

async def process_many_files(file_paths: List[str]) -> Dict[str, str]:
    """
    Open and read multiple files using AsyncExitStack.

    AsyncExitStack manages a dynamic number of context managers.
    All files are properly closed when the stack exits.
    """
    results = {}

    async with AsyncExitStack() as stack:
        # Open all files - they'll all be closed when we exit
        files = {}
        for path in file_paths:
            f = await stack.enter_async_context(aiofiles.open(path, 'r'))
            files[path] = f

        # Now read all files - they're all open
        for path, f in files.items():
            results[path] = await f.read()

    # All files are closed here
    return results

async def merge_files(input_paths: List[str], output_path: str):
    """
    Merge multiple input files into a single output file.

    Reads files one at a time to avoid opening too many
    file handles simultaneously.
    """
    async with aiofiles.open(output_path, 'w') as output:
        for i, input_path in enumerate(input_paths):
            # Add separator between files
            if i > 0:
                await output.write('\n--- Next File ---\n')

            async with aiofiles.open(input_path, 'r') as input_file:
                content = await input_file.read()
                await output.write(content)

async def split_file(input_path: str, output_dir: str, lines_per_file: int):
    """
    Split a large file into smaller chunks.

    Creates numbered output files, each with the specified
    number of lines from the original.
    """
    import os

    file_number = 1
    current_lines = []

    async with aiofiles.open(input_path, 'r') as input_file:
        async for line in input_file:
            current_lines.append(line)

            if len(current_lines) >= lines_per_file:
                # Write current chunk
                output_path = os.path.join(output_dir, f'part_{file_number:04d}.txt')
                async with aiofiles.open(output_path, 'w') as output:
                    await output.writelines(current_lines)

                current_lines = []
                file_number += 1

        # Write remaining lines
        if current_lines:
            output_path = os.path.join(output_dir, f'part_{file_number:04d}.txt')
            async with aiofiles.open(output_path, 'w') as output:
                await output.writelines(current_lines)

async def main():
    # Merge multiple log files
    await merge_files(
        ['log1.txt', 'log2.txt', 'log3.txt'],
        'merged_logs.txt'
    )

    # Split a large file
    await split_file('large_data.txt', 'output_chunks', lines_per_file=1000)

    # Read multiple config files
    configs = await process_many_files(['app.conf', 'db.conf', 'cache.conf'])
    for path, content in configs.items():
        print(f"{path}: {len(content)} bytes")

asyncio.run(main())
```

---

## Concurrent File Operations

### Reading Multiple Files Concurrently

One of the main benefits of async I/O is concurrent operations:

```python
# concurrent_read.py
# Reading multiple files concurrently for maximum throughput
import asyncio
import aiofiles
import time
from pathlib import Path
from typing import Dict, List, Tuple

async def read_file(filepath: str) -> Tuple[str, str]:
    """
    Read a single file and return (path, content).

    This is a simple wrapper that's easy to use with
    asyncio.gather() for concurrent reads.
    """
    async with aiofiles.open(filepath, 'r') as f:
        content = await f.read()
    return filepath, content

async def read_files_sequential(paths: List[str]) -> Dict[str, str]:
    """
    Read files one at a time (slow approach for comparison).

    Each file must finish reading before the next one starts.
    Total time is the sum of all individual read times.
    """
    results = {}
    for path in paths:
        async with aiofiles.open(path, 'r') as f:
            results[path] = await f.read()
    return results

async def read_files_concurrent(paths: List[str]) -> Dict[str, str]:
    """
    Read all files concurrently (fast approach).

    All file reads start immediately and run in parallel.
    Total time is approximately the longest single read time.
    """
    # Create tasks for all file reads
    tasks = [read_file(path) for path in paths]

    # Wait for all tasks to complete
    results = await asyncio.gather(*tasks)

    # Convert list of tuples to dictionary
    return dict(results)

async def read_files_with_limit(paths: List[str], max_concurrent: int = 10) -> Dict[str, str]:
    """
    Read files concurrently with a limit on simultaneous operations.

    This prevents overwhelming the system when processing
    thousands of files. Uses a semaphore to limit concurrency.

    Args:
        paths: List of file paths to read
        max_concurrent: Maximum number of simultaneous reads
    """
    semaphore = asyncio.Semaphore(max_concurrent)

    async def read_with_limit(path: str) -> Tuple[str, str]:
        async with semaphore:
            return await read_file(path)

    tasks = [read_with_limit(path) for path in paths]
    results = await asyncio.gather(*tasks)
    return dict(results)

async def read_files_as_completed(paths: List[str]) -> Dict[str, str]:
    """
    Process files as they complete rather than waiting for all.

    Useful when you want to start processing results immediately
    rather than waiting for the slowest file to finish.
    """
    results = {}

    # Create tasks
    tasks = {asyncio.create_task(read_file(path)): path for path in paths}

    # Process as each task completes
    for coro in asyncio.as_completed(tasks.keys()):
        path, content = await coro
        results[path] = content
        print(f"Completed: {path} ({len(content)} bytes)")

    return results

async def benchmark_read_approaches(paths: List[str]):
    """
    Compare sequential vs concurrent read performance.

    This demonstrates the performance benefit of concurrent I/O.
    The improvement is most noticeable with slow storage or many files.
    """
    # Sequential reads
    start = time.perf_counter()
    await read_files_sequential(paths)
    sequential_time = time.perf_counter() - start

    # Concurrent reads
    start = time.perf_counter()
    await read_files_concurrent(paths)
    concurrent_time = time.perf_counter() - start

    print(f"Sequential: {sequential_time:.3f}s")
    print(f"Concurrent: {concurrent_time:.3f}s")
    print(f"Speedup: {sequential_time / concurrent_time:.1f}x")

async def main():
    # Find all Python files in current directory
    python_files = list(Path('.').glob('*.py'))[:20]  # Limit to 20 files
    paths = [str(f) for f in python_files]

    if not paths:
        print("No Python files found for testing")
        return

    # Benchmark different approaches
    await benchmark_read_approaches(paths)

    # Read with concurrency limit
    results = await read_files_with_limit(paths, max_concurrent=5)
    print(f"Read {len(results)} files with limited concurrency")

asyncio.run(main())
```

### Processing Files in Batches

For very large numbers of files:

```python
# batch_processing.py
# Process large numbers of files in batches
import asyncio
import aiofiles
from typing import List, Callable, Any, AsyncIterator
from dataclasses import dataclass
import os

@dataclass
class FileResult:
    """Result of processing a single file"""
    path: str
    success: bool
    result: Any = None
    error: str = None

async def process_file(filepath: str, processor: Callable) -> FileResult:
    """
    Process a single file with error handling.

    Args:
        filepath: Path to the file
        processor: Function that takes file content and returns processed result

    Returns:
        FileResult with success/failure status and result/error
    """
    try:
        async with aiofiles.open(filepath, 'r') as f:
            content = await f.read()

        result = processor(content)
        return FileResult(path=filepath, success=True, result=result)

    except Exception as e:
        return FileResult(path=filepath, success=False, error=str(e))

async def batch_process_files(
    paths: List[str],
    processor: Callable,
    batch_size: int = 50
) -> AsyncIterator[List[FileResult]]:
    """
    Process files in batches, yielding results as batches complete.

    This approach balances:
    - Concurrency (multiple files per batch)
    - Memory usage (limited batch size)
    - Progress feedback (yields after each batch)

    Args:
        paths: All file paths to process
        processor: Function to apply to each file's content
        batch_size: Number of files to process concurrently
    """
    for i in range(0, len(paths), batch_size):
        batch = paths[i:i + batch_size]

        # Process this batch concurrently
        tasks = [process_file(path, processor) for path in batch]
        results = await asyncio.gather(*tasks)

        yield results

async def transform_files_batch(
    input_paths: List[str],
    output_dir: str,
    transformer: Callable[[str], str],
    batch_size: int = 20
):
    """
    Transform multiple files and write results to a new directory.

    Args:
        input_paths: Source file paths
        output_dir: Directory for transformed files
        transformer: Function that transforms file content
        batch_size: Files to process simultaneously
    """
    os.makedirs(output_dir, exist_ok=True)

    async def transform_single(input_path: str) -> str:
        # Read input
        async with aiofiles.open(input_path, 'r') as f:
            content = await f.read()

        # Transform
        transformed = transformer(content)

        # Write output
        output_path = os.path.join(output_dir, os.path.basename(input_path))
        async with aiofiles.open(output_path, 'w') as f:
            await f.write(transformed)

        return output_path

    # Process in batches
    for i in range(0, len(input_paths), batch_size):
        batch = input_paths[i:i + batch_size]
        tasks = [transform_single(path) for path in batch]
        outputs = await asyncio.gather(*tasks)

        print(f"Processed batch {i // batch_size + 1}: {len(outputs)} files")

async def main():
    # Example: Count lines in all Python files
    def count_lines(content: str) -> int:
        return len(content.splitlines())

    python_files = [f for f in os.listdir('.') if f.endswith('.py')]

    total_lines = 0
    errors = 0

    async for batch_results in batch_process_files(python_files, count_lines, batch_size=5):
        for result in batch_results:
            if result.success:
                total_lines += result.result
                print(f"{result.path}: {result.result} lines")
            else:
                errors += 1
                print(f"{result.path}: ERROR - {result.error}")

    print(f"\nTotal: {total_lines} lines across {len(python_files)} files")
    print(f"Errors: {errors}")

    # Example: Transform files to uppercase
    def to_uppercase(content: str) -> str:
        return content.upper()

    await transform_files_batch(
        python_files[:5],  # Process first 5 files
        'uppercase_output',
        to_uppercase
    )

asyncio.run(main())
```

---

## Working with Temporary Files

### Using aiofiles with tempfile

Combining aiofiles with Python's tempfile module:

```python
# temp_files.py
# Working with temporary files asynchronously
import asyncio
import aiofiles
import aiofiles.tempfile
import tempfile
import os
from typing import Optional

async def using_aiofiles_tempfile():
    """
    Use aiofiles.tempfile for fully async temporary files.

    This provides NamedTemporaryFile and TemporaryDirectory
    with async context manager support.
    """
    # Create a temporary file that's automatically deleted
    async with aiofiles.tempfile.NamedTemporaryFile(
        mode='w',
        suffix='.txt',
        delete=True
    ) as f:
        # Write data to the temp file
        await f.write('Temporary data that will be deleted')
        await f.flush()

        # The file exists and can be read by other processes
        print(f"Temp file created: {f.name}")

        # File is automatically deleted when exiting the context

async def temp_file_for_processing():
    """
    Use a temp file for intermediate processing.

    Common pattern: download large data, process it,
    then clean up the temp file automatically.
    """
    async with aiofiles.tempfile.NamedTemporaryFile(
        mode='wb',
        suffix='.dat',
        delete=False  # Keep file after context exits
    ) as f:
        temp_path = f.name

        # Write some binary data
        await f.write(b'Some binary data for processing')

    # Now process the temp file outside the context
    try:
        async with aiofiles.open(temp_path, 'rb') as f:
            data = await f.read()
            # Process the data...
            print(f"Processed {len(data)} bytes")
    finally:
        # Clean up manually since delete=False
        os.unlink(temp_path)

async def temporary_directory():
    """
    Create a temporary directory for file operations.

    All files in the directory are deleted when the
    context manager exits.
    """
    async with aiofiles.tempfile.TemporaryDirectory() as tmpdir:
        print(f"Working in temp directory: {tmpdir}")

        # Create files in the temp directory
        for i in range(5):
            filepath = os.path.join(tmpdir, f'file_{i}.txt')
            async with aiofiles.open(filepath, 'w') as f:
                await f.write(f'Content for file {i}')

        # List the files
        files = os.listdir(tmpdir)
        print(f"Created {len(files)} files")

        # Process the files...
        for filename in files:
            filepath = os.path.join(tmpdir, filename)
            async with aiofiles.open(filepath, 'r') as f:
                content = await f.read()
                print(f"{filename}: {content}")

    # Directory and all contents are deleted here
    print("Temp directory cleaned up")

async def safe_file_update(filepath: str, new_content: str):
    """
    Safely update a file using a temp file.

    Pattern: Write to temp, then atomic rename.
    This prevents data loss if the write is interrupted.
    """
    # Create temp file in same directory for atomic rename
    dir_path = os.path.dirname(filepath) or '.'

    async with aiofiles.tempfile.NamedTemporaryFile(
        mode='w',
        dir=dir_path,
        delete=False
    ) as f:
        temp_path = f.name
        await f.write(new_content)

    # Atomic rename - either succeeds completely or fails completely
    os.replace(temp_path, filepath)

async def spooled_temp_file():
    """
    Use SpooledTemporaryFile for memory-backed small files.

    Data is kept in memory until it exceeds max_size,
    then spills to disk. Good for small uploads or buffers.
    """
    async with aiofiles.tempfile.SpooledTemporaryFile(
        max_size=10 * 1024,  # 10KB in memory, then spill to disk
        mode='w+b'
    ) as f:
        # Small writes stay in memory (fast)
        await f.write(b'Small data stays in memory')

        # Seek back to read
        await f.seek(0)
        content = await f.read()
        print(f"Read from spooled file: {content}")

async def main():
    # Demo all temp file patterns
    print("--- Named Temporary File ---")
    await using_aiofiles_tempfile()

    print("\n--- Temp File for Processing ---")
    await temp_file_for_processing()

    print("\n--- Temporary Directory ---")
    await temporary_directory()

    print("\n--- Safe File Update ---")
    # Create a test file first
    async with aiofiles.open('config.txt', 'w') as f:
        await f.write('original content')

    await safe_file_update('config.txt', 'updated content')

    async with aiofiles.open('config.txt', 'r') as f:
        print(f"Updated content: {await f.read()}")

    print("\n--- Spooled Temp File ---")
    await spooled_temp_file()

asyncio.run(main())
```

---

## File Operations and OS Functions

### Using aiofiles.os for Async Filesystem Operations

Beyond reading and writing, aiofiles provides async versions of common os functions:

```python
# os_operations.py
# Async filesystem operations with aiofiles.os
import asyncio
import aiofiles
import aiofiles.os
import os
from pathlib import Path
from typing import List

async def file_exists(filepath: str) -> bool:
    """
    Check if a file exists asynchronously.

    Uses aiofiles.os.path.exists() for async operation.
    """
    return await aiofiles.os.path.exists(filepath)

async def get_file_size(filepath: str) -> int:
    """
    Get the size of a file in bytes.

    Uses stat() which returns an os.stat_result object
    with size, modification time, and other metadata.
    """
    stat_result = await aiofiles.os.stat(filepath)
    return stat_result.st_size

async def get_file_info(filepath: str) -> dict:
    """
    Get comprehensive file information.

    Returns modification time, size, and type information.
    """
    stat_result = await aiofiles.os.stat(filepath)

    return {
        'path': filepath,
        'size': stat_result.st_size,
        'modified': stat_result.st_mtime,
        'created': stat_result.st_ctime,
        'is_file': await aiofiles.os.path.isfile(filepath),
        'is_dir': await aiofiles.os.path.isdir(filepath)
    }

async def list_directory(dirpath: str) -> List[str]:
    """
    List contents of a directory asynchronously.

    Returns a list of filenames (not full paths).
    """
    return await aiofiles.os.listdir(dirpath)

async def list_directory_with_info(dirpath: str) -> List[dict]:
    """
    List directory contents with file information.

    Returns detailed info about each item in the directory.
    """
    items = await aiofiles.os.listdir(dirpath)
    results = []

    for item in items:
        full_path = os.path.join(dirpath, item)
        info = await get_file_info(full_path)
        results.append(info)

    return results

async def create_directory(dirpath: str, exist_ok: bool = True):
    """
    Create a directory and any necessary parent directories.

    Args:
        dirpath: Path to create
        exist_ok: Don't raise error if directory exists
    """
    await aiofiles.os.makedirs(dirpath, exist_ok=exist_ok)

async def remove_file(filepath: str):
    """
    Delete a file asynchronously.

    Raises FileNotFoundError if the file doesn't exist.
    """
    await aiofiles.os.remove(filepath)

async def remove_directory(dirpath: str):
    """
    Remove an empty directory.

    For non-empty directories, remove contents first.
    """
    await aiofiles.os.rmdir(dirpath)

async def remove_directory_recursive(dirpath: str):
    """
    Remove a directory and all its contents.

    Be careful with this - it permanently deletes everything.
    """
    items = await aiofiles.os.listdir(dirpath)

    for item in items:
        full_path = os.path.join(dirpath, item)

        if await aiofiles.os.path.isdir(full_path):
            # Recursively remove subdirectory
            await remove_directory_recursive(full_path)
        else:
            # Remove file
            await aiofiles.os.remove(full_path)

    # Remove the now-empty directory
    await aiofiles.os.rmdir(dirpath)

async def rename_file(old_path: str, new_path: str):
    """
    Rename or move a file asynchronously.

    Can move files across directories if on the same filesystem.
    """
    await aiofiles.os.rename(old_path, new_path)

async def copy_file(source: str, destination: str):
    """
    Copy a file asynchronously using chunked read and write.

    Note: aiofiles doesn't have a direct copy function,
    so we implement it with read and write.
    """
    async with aiofiles.open(source, 'rb') as src:
        async with aiofiles.open(destination, 'wb') as dst:
            while True:
                chunk = await src.read(65536)
                if not chunk:
                    break
                await dst.write(chunk)

async def find_files(dirpath: str, pattern: str = '*') -> List[str]:
    """
    Find files matching a pattern in a directory tree.

    Uses synchronous glob but could be extended with
    async directory walking.
    """
    from fnmatch import fnmatch

    results = []

    async def walk(path: str):
        items = await aiofiles.os.listdir(path)

        for item in items:
            full_path = os.path.join(path, item)

            if await aiofiles.os.path.isdir(full_path):
                # Recurse into subdirectory
                await walk(full_path)
            elif fnmatch(item, pattern):
                results.append(full_path)

    await walk(dirpath)
    return results

async def main():
    # Create a test directory structure
    await create_directory('test_dir/subdir')

    # Create some test files
    async with aiofiles.open('test_dir/file1.txt', 'w') as f:
        await f.write('File 1 content')

    async with aiofiles.open('test_dir/file2.txt', 'w') as f:
        await f.write('File 2 content - longer')

    async with aiofiles.open('test_dir/subdir/nested.txt', 'w') as f:
        await f.write('Nested file')

    # Check file existence
    exists = await file_exists('test_dir/file1.txt')
    print(f"file1.txt exists: {exists}")

    # Get file info
    info = await get_file_info('test_dir/file1.txt')
    print(f"File info: {info}")

    # List directory
    contents = await list_directory_with_info('test_dir')
    for item in contents:
        print(f"  {item['path']}: {item['size']} bytes")

    # Find all .txt files
    txt_files = await find_files('test_dir', '*.txt')
    print(f"Found {len(txt_files)} .txt files")

    # Copy a file
    await copy_file('test_dir/file1.txt', 'test_dir/file1_copy.txt')

    # Rename a file
    await rename_file('test_dir/file1_copy.txt', 'test_dir/file1_renamed.txt')

    # Clean up
    await remove_directory_recursive('test_dir')
    print("Cleaned up test directory")

asyncio.run(main())
```

---

## Real-World Examples

### Async Log File Processor

A practical example for processing application logs:

```python
# log_processor.py
# Production-ready async log file processor
import asyncio
import aiofiles
import aiofiles.os
import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Optional, AsyncIterator
from collections import defaultdict

@dataclass
class LogEntry:
    """Parsed log entry"""
    timestamp: datetime
    level: str
    message: str
    source: str = ''
    extra: Dict = field(default_factory=dict)

@dataclass
class LogAnalysis:
    """Results of log analysis"""
    total_entries: int = 0
    entries_by_level: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    errors: List[LogEntry] = field(default_factory=list)
    warnings: List[LogEntry] = field(default_factory=list)
    time_range: tuple = (None, None)

class AsyncLogProcessor:
    """
    Async log file processor for analyzing application logs.

    Supports both plain text and JSON log formats.
    Processes files without loading them entirely into memory.
    """

    # Pattern for common log format: YYYY-MM-DD HH:MM:SS [LEVEL] message
    LOG_PATTERN = re.compile(
        r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+'
        r'\[(\w+)\]\s+'
        r'(.+)'
    )

    def __init__(self, max_errors: int = 100, max_warnings: int = 100):
        self.max_errors = max_errors
        self.max_warnings = max_warnings

    async def parse_line(self, line: str) -> Optional[LogEntry]:
        """
        Parse a single log line into a LogEntry.

        Handles both plain text and JSON formats.
        """
        line = line.strip()
        if not line:
            return None

        # Try JSON format first
        if line.startswith('{'):
            try:
                data = json.loads(line)
                return LogEntry(
                    timestamp=datetime.fromisoformat(data.get('timestamp', '').replace('Z', '+00:00')),
                    level=data.get('level', 'INFO').upper(),
                    message=data.get('message', ''),
                    source=data.get('logger', ''),
                    extra={k: v for k, v in data.items()
                           if k not in ('timestamp', 'level', 'message', 'logger')}
                )
            except (json.JSONDecodeError, ValueError):
                pass

        # Try plain text format
        match = self.LOG_PATTERN.match(line)
        if match:
            timestamp_str, level, message = match.groups()
            return LogEntry(
                timestamp=datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S'),
                level=level.upper(),
                message=message
            )

        return None

    async def process_file(self, filepath: str) -> LogAnalysis:
        """
        Process a single log file and return analysis.

        Streams the file line by line for memory efficiency.
        """
        analysis = LogAnalysis()

        async with aiofiles.open(filepath, 'r') as f:
            async for line in f:
                entry = await self.parse_line(line)
                if not entry:
                    continue

                analysis.total_entries += 1
                analysis.entries_by_level[entry.level] += 1

                # Track time range
                if analysis.time_range[0] is None:
                    analysis.time_range = (entry.timestamp, entry.timestamp)
                else:
                    analysis.time_range = (
                        min(analysis.time_range[0], entry.timestamp),
                        max(analysis.time_range[1], entry.timestamp)
                    )

                # Collect errors and warnings
                if entry.level == 'ERROR' and len(analysis.errors) < self.max_errors:
                    analysis.errors.append(entry)
                elif entry.level == 'WARNING' and len(analysis.warnings) < self.max_warnings:
                    analysis.warnings.append(entry)

        return analysis

    async def process_directory(self, dirpath: str, pattern: str = '*.log') -> LogAnalysis:
        """
        Process all matching log files in a directory.

        Combines results from multiple files into a single analysis.
        """
        from fnmatch import fnmatch

        combined = LogAnalysis()

        files = await aiofiles.os.listdir(dirpath)
        log_files = [f for f in files if fnmatch(f, pattern)]

        # Process files concurrently
        tasks = []
        for filename in log_files:
            filepath = f"{dirpath}/{filename}"
            tasks.append(self.process_file(filepath))

        results = await asyncio.gather(*tasks)

        # Combine results
        for analysis in results:
            combined.total_entries += analysis.total_entries

            for level, count in analysis.entries_by_level.items():
                combined.entries_by_level[level] += count

            combined.errors.extend(analysis.errors[:self.max_errors - len(combined.errors)])
            combined.warnings.extend(analysis.warnings[:self.max_warnings - len(combined.warnings)])

            if analysis.time_range[0]:
                if combined.time_range[0] is None:
                    combined.time_range = analysis.time_range
                else:
                    combined.time_range = (
                        min(combined.time_range[0], analysis.time_range[0]),
                        max(combined.time_range[1], analysis.time_range[1])
                    )

        return combined

    async def search_logs(
        self,
        filepath: str,
        pattern: str,
        level: Optional[str] = None
    ) -> AsyncIterator[LogEntry]:
        """
        Search log file for entries matching a pattern.

        Args:
            filepath: Path to log file
            pattern: Regex pattern to match in message
            level: Optional level filter (ERROR, WARNING, etc.)
        """
        regex = re.compile(pattern, re.IGNORECASE)

        async with aiofiles.open(filepath, 'r') as f:
            async for line in f:
                entry = await self.parse_line(line)
                if not entry:
                    continue

                # Apply level filter
                if level and entry.level != level.upper():
                    continue

                # Apply pattern filter
                if regex.search(entry.message):
                    yield entry

async def main():
    processor = AsyncLogProcessor()

    # Create sample log file for testing
    sample_logs = """2026-02-03 10:00:00 [INFO] Application started
2026-02-03 10:00:01 [DEBUG] Loading configuration
2026-02-03 10:00:02 [INFO] Connected to database
2026-02-03 10:00:05 [WARNING] High memory usage detected
2026-02-03 10:00:10 [ERROR] Failed to process request: timeout
2026-02-03 10:00:15 [INFO] Request completed successfully
2026-02-03 10:00:20 [ERROR] Database connection lost
{"timestamp": "2026-02-03T10:00:25Z", "level": "info", "message": "Reconnected to database", "retry_count": 3}
"""

    async with aiofiles.open('sample.log', 'w') as f:
        await f.write(sample_logs)

    # Process the log file
    analysis = await processor.process_file('sample.log')

    print("Log Analysis Results")
    print("=" * 40)
    print(f"Total entries: {analysis.total_entries}")
    print(f"Time range: {analysis.time_range[0]} to {analysis.time_range[1]}")
    print("\nEntries by level:")
    for level, count in sorted(analysis.entries_by_level.items()):
        print(f"  {level}: {count}")

    print(f"\nErrors ({len(analysis.errors)}):")
    for error in analysis.errors:
        print(f"  [{error.timestamp}] {error.message}")

    # Search for specific patterns
    print("\nSearching for 'database' entries:")
    async for entry in processor.search_logs('sample.log', 'database'):
        print(f"  [{entry.level}] {entry.message}")

    # Clean up
    await aiofiles.os.remove('sample.log')

asyncio.run(main())
```

### Async Configuration Manager

Managing configuration files with async I/O:

```python
# config_manager.py
# Async configuration manager with hot reloading
import asyncio
import aiofiles
import aiofiles.os
import json
import yaml  # pip install pyyaml
from typing import Any, Dict, Optional, Callable
from pathlib import Path
from dataclasses import dataclass
import hashlib

@dataclass
class ConfigFile:
    """Represents a loaded configuration file"""
    path: str
    content: Dict[str, Any]
    hash: str
    last_modified: float

class AsyncConfigManager:
    """
    Async configuration manager with support for multiple formats.

    Features:
    - Load JSON and YAML configs asynchronously
    - Watch for file changes and hot reload
    - Merge multiple config files
    - Environment-specific overrides
    """

    def __init__(self):
        self._configs: Dict[str, ConfigFile] = {}
        self._merged_config: Dict[str, Any] = {}
        self._watchers: Dict[str, asyncio.Task] = {}
        self._change_callbacks: list[Callable] = []

    async def _calculate_hash(self, content: str) -> str:
        """Calculate hash of file content for change detection"""
        return hashlib.md5(content.encode()).hexdigest()

    async def _parse_content(self, content: str, filepath: str) -> Dict[str, Any]:
        """Parse file content based on extension"""
        ext = Path(filepath).suffix.lower()

        if ext == '.json':
            return json.loads(content)
        elif ext in ('.yml', '.yaml'):
            return yaml.safe_load(content)
        else:
            raise ValueError(f"Unsupported config format: {ext}")

    async def load(self, filepath: str) -> Dict[str, Any]:
        """
        Load a configuration file asynchronously.

        Returns the parsed configuration dictionary.
        """
        async with aiofiles.open(filepath, 'r') as f:
            content = await f.read()

        stat = await aiofiles.os.stat(filepath)
        config_data = await self._parse_content(content, filepath)
        content_hash = await self._calculate_hash(content)

        self._configs[filepath] = ConfigFile(
            path=filepath,
            content=config_data,
            hash=content_hash,
            last_modified=stat.st_mtime
        )

        self._update_merged_config()
        return config_data

    async def load_with_env_override(
        self,
        base_path: str,
        env: str = 'development'
    ) -> Dict[str, Any]:
        """
        Load base config with environment-specific overrides.

        Looks for files like:
            config.json (base)
            config.development.json (env override)
        """
        # Load base config
        base_config = await self.load(base_path)

        # Look for environment override
        base = Path(base_path)
        env_path = base.parent / f"{base.stem}.{env}{base.suffix}"

        if await aiofiles.os.path.exists(str(env_path)):
            env_config = await self.load(str(env_path))
            # Deep merge env config over base
            return self._deep_merge(base_config, env_config)

        return base_config

    def _deep_merge(self, base: Dict, override: Dict) -> Dict:
        """Deep merge two dictionaries, with override taking precedence"""
        result = base.copy()

        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value

        return result

    def _update_merged_config(self):
        """Update the merged configuration from all loaded files"""
        self._merged_config = {}
        for config_file in self._configs.values():
            self._merged_config = self._deep_merge(
                self._merged_config,
                config_file.content
            )

    def get(self, key: str, default: Any = None) -> Any:
        """
        Get a configuration value by key.

        Supports dot notation: config.get('database.host')
        """
        keys = key.split('.')
        value = self._merged_config

        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default

        return value

    def on_change(self, callback: Callable):
        """Register a callback for configuration changes"""
        self._change_callbacks.append(callback)

    async def watch(self, filepath: str, interval: float = 1.0):
        """
        Watch a config file for changes and reload automatically.

        Args:
            filepath: Path to watch
            interval: Check interval in seconds
        """
        if filepath not in self._configs:
            await self.load(filepath)

        async def watcher():
            while True:
                await asyncio.sleep(interval)

                try:
                    stat = await aiofiles.os.stat(filepath)
                    current_mtime = stat.st_mtime

                    if current_mtime > self._configs[filepath].last_modified:
                        # File changed - reload
                        old_config = self._configs[filepath].content.copy()
                        await self.load(filepath)

                        # Notify callbacks
                        for callback in self._change_callbacks:
                            await callback(filepath, old_config, self._configs[filepath].content)

                except Exception as e:
                    print(f"Error watching {filepath}: {e}")

        task = asyncio.create_task(watcher())
        self._watchers[filepath] = task

    def stop_watching(self, filepath: str):
        """Stop watching a file for changes"""
        if filepath in self._watchers:
            self._watchers[filepath].cancel()
            del self._watchers[filepath]

    async def save(self, filepath: str, config: Dict[str, Any]):
        """
        Save configuration to a file atomically.

        Uses temp file plus rename for atomic update.
        """
        ext = Path(filepath).suffix.lower()

        if ext == '.json':
            content = json.dumps(config, indent=2)
        elif ext in ('.yml', '.yaml'):
            content = yaml.dump(config, default_flow_style=False)
        else:
            raise ValueError(f"Unsupported config format: {ext}")

        # Write to temp file first
        temp_path = filepath + '.tmp'
        async with aiofiles.open(temp_path, 'w') as f:
            await f.write(content)

        # Atomic rename
        await aiofiles.os.rename(temp_path, filepath)

async def main():
    # Create sample config files
    base_config = {
        'app': {
            'name': 'MyApp',
            'version': '1.0.0'
        },
        'database': {
            'host': 'localhost',
            'port': 5432,
            'name': 'myapp_db'
        },
        'logging': {
            'level': 'INFO'
        }
    }

    dev_override = {
        'database': {
            'name': 'myapp_dev'
        },
        'logging': {
            'level': 'DEBUG'
        }
    }

    # Write config files
    async with aiofiles.open('config.json', 'w') as f:
        await f.write(json.dumps(base_config, indent=2))

    async with aiofiles.open('config.development.json', 'w') as f:
        await f.write(json.dumps(dev_override, indent=2))

    # Load and use config manager
    config = AsyncConfigManager()

    # Load with environment override
    merged = await config.load_with_env_override('config.json', 'development')

    print("Loaded configuration:")
    print(f"  App name: {config.get('app.name')}")
    print(f"  Database: {config.get('database.name')}")
    print(f"  Log level: {config.get('logging.level')}")

    # Set up change callback
    async def on_config_change(path, old, new):
        print(f"Config changed: {path}")

    config.on_change(on_config_change)

    # Clean up
    await aiofiles.os.remove('config.json')
    await aiofiles.os.remove('config.development.json')

asyncio.run(main())
```

---

## Best Practices

### Dos and Don'ts

```python
# best_practices.py
# Patterns to follow and avoid with aiofiles

import asyncio
import aiofiles

# DO: Use async context managers
async def good_file_handling():
    async with aiofiles.open('file.txt', 'r') as f:
        content = await f.read()
    return content

# DON'T: Manual open/close - risk of leaking file handles
async def bad_file_handling():
    f = await aiofiles.open('file.txt', 'r')
    content = await f.read()
    await f.close()  # Might not run if exception occurs
    return content

# DO: Process large files in chunks
async def good_large_file():
    async with aiofiles.open('large.bin', 'rb') as f:
        while True:
            chunk = await f.read(65536)
            if not chunk:
                break
            process(chunk)

# DON'T: Load entire large file into memory
async def bad_large_file():
    async with aiofiles.open('large.bin', 'rb') as f:
        data = await f.read()  # Could exhaust memory
    process(data)

# DO: Limit concurrency when processing many files
async def good_many_files(paths):
    semaphore = asyncio.Semaphore(10)

    async def read_with_limit(path):
        async with semaphore:
            async with aiofiles.open(path, 'r') as f:
                return await f.read()

    return await asyncio.gather(*[read_with_limit(p) for p in paths])

# DON'T: Open thousands of files simultaneously
async def bad_many_files(paths):
    tasks = []
    for path in paths:
        # This could exhaust file descriptors
        tasks.append(aiofiles.open(path, 'r'))
    # Opening all at once is problematic
    handles = await asyncio.gather(*tasks)

# DO: Use atomic writes for important files
async def good_atomic_write(path, content):
    temp_path = path + '.tmp'
    async with aiofiles.open(temp_path, 'w') as f:
        await f.write(content)
    import os
    os.replace(temp_path, path)

# DON'T: Write directly to important files
async def bad_direct_write(path, content):
    # If this crashes midway, file is corrupted
    async with aiofiles.open(path, 'w') as f:
        await f.write(content)
```

---

## Troubleshooting Common Issues

### Handling Encoding Errors

```python
# encoding_issues.py
# Dealing with file encoding problems

import asyncio
import aiofiles

async def read_with_fallback_encoding(filepath: str) -> str:
    """
    Try multiple encodings to read a file.

    Useful when file encoding is unknown.
    """
    encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']

    for encoding in encodings:
        try:
            async with aiofiles.open(filepath, 'r', encoding=encoding) as f:
                content = await f.read()
                return content
        except UnicodeDecodeError:
            continue

    # Last resort: read as binary and decode with errors ignored
    async with aiofiles.open(filepath, 'rb') as f:
        content = await f.read()
    return content.decode('utf-8', errors='replace')

async def detect_encoding(filepath: str) -> str:
    """
    Detect file encoding using chardet library.

    pip install chardet
    """
    import chardet

    async with aiofiles.open(filepath, 'rb') as f:
        raw = await f.read()

    result = chardet.detect(raw)
    return result['encoding']
```

### Handling Permission Errors

```python
# permission_handling.py
# Graceful handling of permission issues

import asyncio
import aiofiles
import aiofiles.os

async def safe_read(filepath: str, default: str = '') -> str:
    """
    Read a file with graceful error handling.

    Returns default value if file cannot be read.
    """
    try:
        async with aiofiles.open(filepath, 'r') as f:
            return await f.read()
    except PermissionError:
        print(f"Permission denied: {filepath}")
        return default
    except FileNotFoundError:
        print(f"File not found: {filepath}")
        return default
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return default

async def ensure_writable(filepath: str) -> bool:
    """
    Check if we can write to a file location.

    Tests by attempting to create/open the file.
    """
    try:
        async with aiofiles.open(filepath, 'a') as f:
            pass  # Just open and close
        return True
    except (PermissionError, OSError):
        return False
```

---

## Summary

The aiofiles library transforms file I/O from a blocking bottleneck into a cooperative part of your async Python application. Key takeaways:

1. **Always use async context managers** to ensure files are properly closed
2. **Process large files in chunks** rather than loading everything into memory
3. **Limit concurrency** when working with many files to avoid exhausting file descriptors
4. **Use atomic writes** for configuration and important data files
5. **Handle encoding explicitly** to avoid surprises with non-ASCII content
6. **Combine with asyncio.gather()** for concurrent file processing

Whether you are building an async web server, a file processing pipeline, or a configuration management system, aiofiles provides the tools to keep your application responsive while handling file I/O.

---

*Need to monitor your async Python applications in production? [OneUptime](https://oneuptime.com) provides comprehensive observability with native OpenTelemetry support, helping you track async operations, identify bottlenecks, and ensure your file processing pipelines run smoothly. Start monitoring for free today.*

**Related Reading:**
- [How to Structure Logs Properly in Python with OpenTelemetry](https://oneuptime.com/blog/post/2025-01-06-python-structured-logging-opentelemetry/view)
- [Python Health Checks for Kubernetes](https://oneuptime.com/blog/post/2025-01-06-python-health-checks-kubernetes/view)
- [FastAPI Rate Limiting](https://oneuptime.com/blog/post/2025-01-06-fastapi-rate-limiting/view)
