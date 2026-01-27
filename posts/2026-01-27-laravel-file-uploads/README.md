# How to Implement File Uploads with Laravel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Laravel, PHP, File Uploads, Storage, AWS S3, Validation, Cloud Storage

Description: Learn how to implement file uploads in Laravel including validation, storage configuration, S3 integration, and chunked uploads for large files.

---

> File uploads are a fundamental feature for most web applications. Laravel provides an elegant, unified API for working with files whether you are storing them locally, on Amazon S3, or any other cloud provider. Understanding the filesystem abstraction layer is key to building robust upload functionality.

This guide covers everything from basic uploads to advanced patterns like chunked uploads, image manipulation, and cloud storage integration.

---

## Prerequisites

Before starting, ensure you have:
- PHP 8.1 or higher
- Laravel 10.x or 11.x
- Composer installed
- A working Laravel application

---

## Basic File Upload Handling

The simplest approach to handle file uploads uses Laravel's `Request` object and the `store()` method.

### Controller Setup

Create a controller to handle file uploads. The `store()` method automatically generates a unique filename and saves the file:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FileUploadController extends Controller
{
    /**
     * Handle a basic file upload request.
     * Files are stored in storage/app/uploads by default.
     */
    public function store(Request $request)
    {
        // Validate that a file was uploaded
        $request->validate([
            'file' => 'required|file|max:10240', // Max 10MB
        ]);

        // Store the file and get the path
        // The store() method generates a unique filename automatically
        $path = $request->file('file')->store('uploads');

        return response()->json([
            'message' => 'File uploaded successfully',
            'path' => $path,
        ]);
    }

    /**
     * Store a file with a custom filename.
     * Useful when you need predictable file names.
     */
    public function storeWithCustomName(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:10240',
        ]);

        $file = $request->file('file');

        // Generate a custom filename using timestamp and original extension
        $filename = time() . '_' . $file->getClientOriginalName();

        // storeAs() lets you specify the exact filename
        $path = $file->storeAs('uploads', $filename);

        return response()->json([
            'message' => 'File uploaded successfully',
            'path' => $path,
            'filename' => $filename,
        ]);
    }
}
```

### Routes Configuration

```php
// routes/web.php
use App\Http\Controllers\FileUploadController;

Route::post('/upload', [FileUploadController::class, 'store']);
Route::post('/upload/custom', [FileUploadController::class, 'storeWithCustomName']);
```

### Basic Upload Form

```html
<!-- resources/views/upload.blade.php -->
<form action="/upload" method="POST" enctype="multipart/form-data">
    @csrf
    <input type="file" name="file" required>
    <button type="submit">Upload</button>
</form>

@if ($errors->any())
    <ul>
        @foreach ($errors->all() as $error)
            <li>{{ $error }}</li>
        @endforeach
    </ul>
@endif
```

---

## File Validation

Laravel provides comprehensive validation rules for uploaded files including type, size, and dimensions.

### Validating File Types and Size

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class DocumentController extends Controller
{
    /**
     * Upload a document with strict validation.
     * Demonstrates various file validation rules.
     */
    public function upload(Request $request)
    {
        $validated = $request->validate([
            // Basic file validation - required, must be a file, max 5MB
            'document' => 'required|file|max:5120',

            // Validate by MIME type - more secure than extension
            'pdf_file' => 'required|mimes:pdf|max:10240',

            // Validate by multiple MIME types
            'office_doc' => 'nullable|mimes:doc,docx,xls,xlsx,ppt,pptx|max:20480',

            // Validate by MIME type category
            'any_image' => 'nullable|mimetypes:image/jpeg,image/png,image/gif|max:5120',
        ]);

        // Process validated files
        if ($request->hasFile('document')) {
            $path = $request->file('document')->store('documents');
        }

        return response()->json(['message' => 'Documents uploaded']);
    }
}
```

### Validating Image Dimensions

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ImageController extends Controller
{
    /**
     * Upload images with dimension constraints.
     * Useful for avatars, thumbnails, and banners.
     */
    public function uploadAvatar(Request $request)
    {
        $validated = $request->validate([
            // Image must be between 100x100 and 1000x1000 pixels
            'avatar' => [
                'required',
                'image', // Validates as jpeg, png, bmp, gif, svg, or webp
                'mimes:jpeg,png',
                'max:2048', // 2MB max
                'dimensions:min_width=100,min_height=100,max_width=1000,max_height=1000',
            ],
        ]);

        $path = $request->file('avatar')->store('avatars', 'public');

        return response()->json([
            'message' => 'Avatar uploaded',
            'url' => Storage::url($path),
        ]);
    }

    /**
     * Upload a banner with aspect ratio validation.
     */
    public function uploadBanner(Request $request)
    {
        $validated = $request->validate([
            'banner' => [
                'required',
                'image',
                'mimes:jpeg,png,webp',
                'max:5120',
                // Require specific aspect ratio (16:9)
                'dimensions:ratio=16/9',
            ],
        ]);

        $path = $request->file('banner')->store('banners', 'public');

        return response()->json(['path' => $path]);
    }
}
```

### Custom Validation Rules

```php
<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Custom rule to validate file content type by reading magic bytes.
 * More secure than relying on file extension alone.
 */
class ValidImageContent implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!$value instanceof \Illuminate\Http\UploadedFile) {
            $fail('The :attribute must be a file.');
            return;
        }

        // Read the first 8 bytes to check magic numbers
        $handle = fopen($value->getPathname(), 'rb');
        $bytes = fread($handle, 8);
        fclose($handle);

        // Check for common image magic bytes
        $validSignatures = [
            "\xFF\xD8\xFF",           // JPEG
            "\x89PNG\r\n\x1A\n",      // PNG
            "GIF87a",                  // GIF87a
            "GIF89a",                  // GIF89a
        ];

        $isValid = false;
        foreach ($validSignatures as $signature) {
            if (str_starts_with($bytes, $signature)) {
                $isValid = true;
                break;
            }
        }

        if (!$isValid) {
            $fail('The :attribute does not contain valid image data.');
        }
    }
}

// Usage in controller:
// 'image' => ['required', new ValidImageContent()],
```

---

## Laravel Filesystem and Storage Disks

Laravel's filesystem abstraction uses "disks" to represent different storage locations. Configure these in `config/filesystems.php`.

### Understanding Storage Disks

```php
<?php
// config/filesystems.php

return [
    // Default disk used when no disk is specified
    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [
        // Local storage - files stored in storage/app
        'local' => [
            'driver' => 'local',
            'root' => storage_path('app'),
            'throw' => false,
        ],

        // Public disk - files accessible via web
        // Run: php artisan storage:link
        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL') . '/storage',
            'visibility' => 'public',
            'throw' => false,
        ],

        // Custom disk for temporary uploads
        'temp' => [
            'driver' => 'local',
            'root' => storage_path('app/temp'),
            'throw' => false,
        ],

        // S3-compatible storage (covered in next section)
        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
        ],
    ],
];
```

### Using Different Disks

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StorageController extends Controller
{
    /**
     * Demonstrate storing files on different disks.
     */
    public function storeOnDisk(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:10240',
        ]);

        $file = $request->file('file');

        // Store on the default disk (local)
        $localPath = $file->store('uploads');

        // Store on a specific disk using the disk() method
        $publicPath = $file->store('uploads', 'public');

        // Alternative syntax using Storage facade
        $s3Path = Storage::disk('s3')->put(
            'uploads',
            $file
        );

        return response()->json([
            'local_path' => $localPath,
            'public_path' => $publicPath,
            'public_url' => Storage::disk('public')->url($publicPath),
            's3_path' => $s3Path,
        ]);
    }

    /**
     * Common Storage facade operations.
     */
    public function storageOperations()
    {
        // Check if file exists
        $exists = Storage::disk('public')->exists('uploads/file.pdf');

        // Get file contents
        $contents = Storage::disk('public')->get('uploads/file.pdf');

        // Get file URL (for public disk)
        $url = Storage::disk('public')->url('uploads/file.pdf');

        // Delete a file
        Storage::disk('public')->delete('uploads/old-file.pdf');

        // Delete multiple files
        Storage::disk('public')->delete([
            'uploads/file1.pdf',
            'uploads/file2.pdf',
        ]);

        // Copy a file
        Storage::disk('public')->copy(
            'uploads/original.pdf',
            'backups/original.pdf'
        );

        // Move a file
        Storage::disk('public')->move(
            'temp/uploaded.pdf',
            'documents/final.pdf'
        );

        // Get file size in bytes
        $size = Storage::disk('public')->size('uploads/file.pdf');

        // Get last modified timestamp
        $lastModified = Storage::disk('public')->lastModified('uploads/file.pdf');

        // List all files in a directory
        $files = Storage::disk('public')->files('uploads');

        // List all files recursively
        $allFiles = Storage::disk('public')->allFiles('uploads');

        // List directories
        $directories = Storage::disk('public')->directories('uploads');
    }
}
```

---

## Configuring Cloud Storage (S3, GCS)

### Amazon S3 Configuration

Install the S3 driver and configure your credentials:

```bash
composer require league/flysystem-aws-s3-v3 "^3.0"
```

```php
// .env
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=your-bucket-name
AWS_USE_PATH_STYLE_ENDPOINT=false
```

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class S3UploadController extends Controller
{
    /**
     * Upload a file directly to S3.
     */
    public function uploadToS3(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:51200', // 50MB max
        ]);

        $file = $request->file('file');

        // Generate a unique path with date-based organization
        $path = sprintf(
            'uploads/%s/%s',
            now()->format('Y/m/d'),
            $file->hashName()
        );

        // Store on S3 with public visibility
        Storage::disk('s3')->put($path, file_get_contents($file), 'public');

        // Get the public URL
        $url = Storage::disk('s3')->url($path);

        return response()->json([
            'message' => 'File uploaded to S3',
            'path' => $path,
            'url' => $url,
        ]);
    }

    /**
     * Upload with custom S3 options like metadata and caching.
     */
    public function uploadWithOptions(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:51200',
        ]);

        $file = $request->file('file');
        $path = 'uploads/' . $file->hashName();

        // Store with additional S3 options
        Storage::disk('s3')->put($path, file_get_contents($file), [
            'visibility' => 'public',
            'CacheControl' => 'max-age=31536000', // 1 year cache
            'ContentType' => $file->getMimeType(),
            'Metadata' => [
                'original-name' => $file->getClientOriginalName(),
                'uploaded-by' => auth()->id() ?? 'anonymous',
            ],
        ]);

        return response()->json([
            'path' => $path,
            'url' => Storage::disk('s3')->url($path),
        ]);
    }
}
```

### Google Cloud Storage Configuration

```bash
composer require league/flysystem-google-cloud-storage "^3.0"
```

```php
// config/filesystems.php - add to disks array
'gcs' => [
    'driver' => 'gcs',
    'project_id' => env('GOOGLE_CLOUD_PROJECT_ID'),
    'key_file' => env('GOOGLE_CLOUD_KEY_FILE'), // Path to service account JSON
    'bucket' => env('GOOGLE_CLOUD_STORAGE_BUCKET'),
    'path_prefix' => env('GOOGLE_CLOUD_STORAGE_PATH_PREFIX', ''),
    'storage_api_uri' => env('GOOGLE_CLOUD_STORAGE_API_URI', null),
    'visibility' => 'public',
],
```

---

## Public vs Private File Storage

Understanding when to use public vs private storage is critical for security.

### Public Files

Public files are accessible directly via URL without authentication:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PublicFileController extends Controller
{
    /**
     * Store a publicly accessible file.
     * Good for: profile pictures, product images, public documents.
     */
    public function storePublic(Request $request)
    {
        $request->validate([
            'image' => 'required|image|max:5120',
        ]);

        // Store in the public disk
        // Files are accessible at /storage/images/...
        $path = $request->file('image')->store('images', 'public');

        return response()->json([
            'path' => $path,
            // Generate public URL
            'url' => Storage::disk('public')->url($path),
            // Or use the asset helper
            'asset_url' => asset('storage/' . $path),
        ]);
    }
}
```

### Private Files

Private files require authentication and should be served through your application:

```php
<?php

namespace App\Http\Controllers;

use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PrivateFileController extends Controller
{
    /**
     * Store a private file.
     * Good for: user documents, invoices, sensitive data.
     */
    public function storePrivate(Request $request)
    {
        $request->validate([
            'document' => 'required|file|mimes:pdf,doc,docx|max:10240',
        ]);

        // Store on the local (private) disk
        // Files are NOT publicly accessible
        $path = $request->file('document')->store('documents');

        // Save reference in database
        $document = Document::create([
            'user_id' => auth()->id(),
            'path' => $path,
            'original_name' => $request->file('document')->getClientOriginalName(),
            'mime_type' => $request->file('document')->getMimeType(),
            'size' => $request->file('document')->getSize(),
        ]);

        return response()->json([
            'message' => 'Document uploaded',
            'document_id' => $document->id,
        ]);
    }

    /**
     * Download a private file with authorization check.
     */
    public function download(Document $document)
    {
        // Authorization check - ensure user owns the document
        if ($document->user_id !== auth()->id()) {
            abort(403, 'Unauthorized access');
        }

        // Check if file exists
        if (!Storage::exists($document->path)) {
            abort(404, 'File not found');
        }

        // Stream the file to the browser
        return Storage::download(
            $document->path,
            $document->original_name,
            ['Content-Type' => $document->mime_type]
        );
    }

    /**
     * Stream a private file for inline viewing (e.g., PDFs in browser).
     */
    public function view(Document $document): StreamedResponse
    {
        if ($document->user_id !== auth()->id()) {
            abort(403);
        }

        return Storage::response($document->path, $document->original_name, [
            'Content-Type' => $document->mime_type,
            'Content-Disposition' => 'inline; filename="' . $document->original_name . '"',
        ]);
    }
}
```

---

## Generating URLs for Stored Files

### Temporary URLs for Private S3 Files

```php
<?php

namespace App\Http\Controllers;

use App\Models\Document;
use Illuminate\Support\Facades\Storage;

class FileUrlController extends Controller
{
    /**
     * Generate a temporary signed URL for S3 files.
     * The URL expires after the specified time.
     */
    public function getTemporaryUrl(Document $document)
    {
        $this->authorize('view', $document);

        // Generate URL that expires in 5 minutes
        $url = Storage::disk('s3')->temporaryUrl(
            $document->path,
            now()->addMinutes(5)
        );

        return response()->json(['url' => $url]);
    }

    /**
     * Generate temporary URL with custom headers.
     * Useful for forcing downloads or setting content type.
     */
    public function getDownloadUrl(Document $document)
    {
        $this->authorize('view', $document);

        $url = Storage::disk('s3')->temporaryUrl(
            $document->path,
            now()->addMinutes(5),
            [
                'ResponseContentDisposition' => 'attachment; filename="' . $document->original_name . '"',
                'ResponseContentType' => $document->mime_type,
            ]
        );

        return response()->json(['download_url' => $url]);
    }

    /**
     * Generate signed URL for local files using Laravel's URL signer.
     */
    public function getSignedLocalUrl(Document $document)
    {
        $this->authorize('view', $document);

        // Create a signed route that expires in 30 minutes
        $url = URL::temporarySignedRoute(
            'files.download',
            now()->addMinutes(30),
            ['document' => $document->id]
        );

        return response()->json(['url' => $url]);
    }
}
```

### Route for Signed URL Downloads

```php
// routes/web.php
use Illuminate\Support\Facades\Route;

Route::get('/files/{document}/download', [FileUrlController::class, 'signedDownload'])
    ->name('files.download')
    ->middleware('signed'); // Validates the signature
```

---

## Image Manipulation with Intervention Image

Intervention Image is the standard library for image manipulation in Laravel.

### Installation

```bash
composer require intervention/image-laravel
php artisan vendor:publish --provider="Intervention\Image\Laravel\ServiceProvider"
```

### Image Processing Examples

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Laravel\Facades\Image;
use Intervention\Image\Encoders\JpegEncoder;
use Intervention\Image\Encoders\WebpEncoder;

class ImageProcessingController extends Controller
{
    /**
     * Upload and resize an image to multiple sizes.
     * Creates thumbnail, medium, and large versions.
     */
    public function uploadWithResize(Request $request)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,webp|max:10240',
        ]);

        $file = $request->file('image');
        $filename = pathinfo($file->hashName(), PATHINFO_FILENAME);

        // Read the uploaded image
        $image = Image::read($file);

        // Define sizes to generate
        $sizes = [
            'thumb' => [150, 150],
            'medium' => [600, 600],
            'large' => [1200, 1200],
        ];

        $paths = [];

        foreach ($sizes as $sizeName => [$width, $height]) {
            // Clone the image for each size
            $resized = clone $image;

            // Resize maintaining aspect ratio, fitting within bounds
            $resized->scaleDown($width, $height);

            // Encode as JPEG with 85% quality
            $encoded = $resized->encode(new JpegEncoder(85));

            // Generate path and store
            $path = "images/{$sizeName}/{$filename}.jpg";
            Storage::disk('public')->put($path, (string) $encoded);

            $paths[$sizeName] = Storage::disk('public')->url($path);
        }

        // Store original as well
        $originalPath = $file->store('images/original', 'public');
        $paths['original'] = Storage::disk('public')->url($originalPath);

        return response()->json([
            'message' => 'Image processed successfully',
            'urls' => $paths,
        ]);
    }

    /**
     * Create a cropped avatar from an uploaded image.
     */
    public function createAvatar(Request $request)
    {
        $request->validate([
            'image' => 'required|image|max:5120',
            'x' => 'required|integer|min:0',
            'y' => 'required|integer|min:0',
            'size' => 'required|integer|min:50|max:500',
        ]);

        $file = $request->file('image');
        $image = Image::read($file);

        // Crop to square from specified coordinates
        $image->crop(
            $request->integer('size'),
            $request->integer('size'),
            $request->integer('x'),
            $request->integer('y')
        );

        // Resize to standard avatar size
        $image->resize(200, 200);

        // Encode as WebP for better compression
        $encoded = $image->encode(new WebpEncoder(90));

        // Save the avatar
        $path = 'avatars/' . auth()->id() . '.webp';
        Storage::disk('public')->put($path, (string) $encoded);

        return response()->json([
            'message' => 'Avatar created',
            'url' => Storage::disk('public')->url($path),
        ]);
    }

    /**
     * Add a watermark to uploaded images.
     */
    public function uploadWithWatermark(Request $request)
    {
        $request->validate([
            'image' => 'required|image|max:10240',
        ]);

        $file = $request->file('image');
        $image = Image::read($file);

        // Load watermark image
        $watermark = Image::read(resource_path('images/watermark.png'));

        // Resize watermark to 20% of image width
        $watermarkWidth = (int) ($image->width() * 0.2);
        $watermark->scale($watermarkWidth);

        // Place watermark in bottom-right corner with 10px padding
        $image->place(
            $watermark,
            'bottom-right',
            10,
            10
        );

        // Encode and store
        $encoded = $image->encode(new JpegEncoder(90));
        $path = 'images/watermarked/' . $file->hashName();
        Storage::disk('public')->put($path, (string) $encoded);

        return response()->json([
            'url' => Storage::disk('public')->url($path),
        ]);
    }
}
```

---

## Chunked Uploads for Large Files

For files larger than your server's upload limit, implement chunked uploads.

### Chunked Upload Controller

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ChunkedUploadController extends Controller
{
    /**
     * Initialize a chunked upload session.
     * Returns an upload ID for subsequent chunk uploads.
     */
    public function initiate(Request $request)
    {
        $validated = $request->validate([
            'filename' => 'required|string|max:255',
            'filesize' => 'required|integer|min:1',
            'mime_type' => 'required|string',
            'total_chunks' => 'required|integer|min:1',
        ]);

        // Generate unique upload ID
        $uploadId = Str::uuid()->toString();

        // Create temp directory for chunks
        $tempDir = "chunks/{$uploadId}";
        Storage::disk('local')->makeDirectory($tempDir);

        // Store upload metadata
        Storage::disk('local')->put("{$tempDir}/metadata.json", json_encode([
            'filename' => $validated['filename'],
            'filesize' => $validated['filesize'],
            'mime_type' => $validated['mime_type'],
            'total_chunks' => $validated['total_chunks'],
            'uploaded_chunks' => [],
            'created_at' => now()->toIso8601String(),
            'user_id' => auth()->id(),
        ]));

        return response()->json([
            'upload_id' => $uploadId,
            'chunk_size' => 5 * 1024 * 1024, // 5MB recommended chunk size
        ]);
    }

    /**
     * Upload a single chunk.
     */
    public function uploadChunk(Request $request)
    {
        $validated = $request->validate([
            'upload_id' => 'required|uuid',
            'chunk_number' => 'required|integer|min:0',
            'chunk' => 'required|file',
        ]);

        $uploadId = $validated['upload_id'];
        $chunkNumber = $validated['chunk_number'];
        $tempDir = "chunks/{$uploadId}";

        // Verify upload session exists
        if (!Storage::disk('local')->exists("{$tempDir}/metadata.json")) {
            return response()->json(['error' => 'Invalid upload session'], 404);
        }

        // Load metadata
        $metadata = json_decode(
            Storage::disk('local')->get("{$tempDir}/metadata.json"),
            true
        );

        // Verify user owns this upload
        if ($metadata['user_id'] !== auth()->id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Save the chunk
        $chunkPath = "{$tempDir}/chunk_{$chunkNumber}";
        Storage::disk('local')->put(
            $chunkPath,
            file_get_contents($request->file('chunk')->getPathname())
        );

        // Update metadata
        $metadata['uploaded_chunks'][] = $chunkNumber;
        $metadata['uploaded_chunks'] = array_unique($metadata['uploaded_chunks']);
        sort($metadata['uploaded_chunks']);

        Storage::disk('local')->put(
            "{$tempDir}/metadata.json",
            json_encode($metadata)
        );

        $progress = count($metadata['uploaded_chunks']) / $metadata['total_chunks'] * 100;

        return response()->json([
            'message' => 'Chunk uploaded',
            'chunk_number' => $chunkNumber,
            'progress' => round($progress, 2),
            'uploaded_chunks' => count($metadata['uploaded_chunks']),
            'total_chunks' => $metadata['total_chunks'],
        ]);
    }

    /**
     * Complete the chunked upload by assembling all chunks.
     */
    public function complete(Request $request)
    {
        $validated = $request->validate([
            'upload_id' => 'required|uuid',
        ]);

        $uploadId = $validated['upload_id'];
        $tempDir = "chunks/{$uploadId}";

        // Load metadata
        $metadata = json_decode(
            Storage::disk('local')->get("{$tempDir}/metadata.json"),
            true
        );

        // Verify all chunks are uploaded
        if (count($metadata['uploaded_chunks']) !== $metadata['total_chunks']) {
            return response()->json([
                'error' => 'Not all chunks uploaded',
                'uploaded' => count($metadata['uploaded_chunks']),
                'expected' => $metadata['total_chunks'],
            ], 400);
        }

        // Assemble chunks into final file
        $finalPath = 'uploads/' . Str::uuid() . '_' . $metadata['filename'];
        $finalFullPath = Storage::disk('local')->path($finalPath);

        // Create output file
        $output = fopen($finalFullPath, 'wb');

        // Append each chunk in order
        for ($i = 0; $i < $metadata['total_chunks']; $i++) {
            $chunkPath = Storage::disk('local')->path("{$tempDir}/chunk_{$i}");
            $chunk = fopen($chunkPath, 'rb');
            stream_copy_to_stream($chunk, $output);
            fclose($chunk);
        }

        fclose($output);

        // Verify file size
        $actualSize = filesize($finalFullPath);
        if ($actualSize !== $metadata['filesize']) {
            Storage::disk('local')->delete($finalPath);
            return response()->json([
                'error' => 'File size mismatch',
                'expected' => $metadata['filesize'],
                'actual' => $actualSize,
            ], 400);
        }

        // Cleanup temp directory
        Storage::disk('local')->deleteDirectory($tempDir);

        return response()->json([
            'message' => 'Upload complete',
            'path' => $finalPath,
            'size' => $actualSize,
        ]);
    }

    /**
     * Cancel an upload and cleanup chunks.
     */
    public function cancel(Request $request)
    {
        $validated = $request->validate([
            'upload_id' => 'required|uuid',
        ]);

        $tempDir = "chunks/{$validated['upload_id']}";

        if (Storage::disk('local')->exists($tempDir)) {
            Storage::disk('local')->deleteDirectory($tempDir);
        }

        return response()->json(['message' => 'Upload cancelled']);
    }
}
```

### JavaScript Client for Chunked Uploads

```javascript
// resources/js/chunked-upload.js

class ChunkedUploader {
    constructor(file, options = {}) {
        this.file = file;
        this.chunkSize = options.chunkSize || 5 * 1024 * 1024; // 5MB
        this.onProgress = options.onProgress || (() => {});
        this.onComplete = options.onComplete || (() => {});
        this.onError = options.onError || (() => {});
    }

    async upload() {
        try {
            // Calculate total chunks
            const totalChunks = Math.ceil(this.file.size / this.chunkSize);

            // Initiate upload
            const initResponse = await fetch('/api/upload/chunked/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify({
                    filename: this.file.name,
                    filesize: this.file.size,
                    mime_type: this.file.type,
                    total_chunks: totalChunks,
                }),
            });

            const { upload_id } = await initResponse.json();

            // Upload chunks
            for (let i = 0; i < totalChunks; i++) {
                const start = i * this.chunkSize;
                const end = Math.min(start + this.chunkSize, this.file.size);
                const chunk = this.file.slice(start, end);

                const formData = new FormData();
                formData.append('upload_id', upload_id);
                formData.append('chunk_number', i);
                formData.append('chunk', chunk);

                const chunkResponse = await fetch('/api/upload/chunked/chunk', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                    },
                    body: formData,
                });

                const result = await chunkResponse.json();
                this.onProgress(result.progress);
            }

            // Complete upload
            const completeResponse = await fetch('/api/upload/chunked/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify({ upload_id }),
            });

            const finalResult = await completeResponse.json();
            this.onComplete(finalResult);

        } catch (error) {
            this.onError(error);
        }
    }
}

// Usage
const uploader = new ChunkedUploader(fileInput.files[0], {
    onProgress: (percent) => console.log(`Progress: ${percent}%`),
    onComplete: (result) => console.log('Upload complete:', result),
    onError: (error) => console.error('Upload failed:', error),
});

uploader.upload();
```

---

## Multiple File Uploads

Handle multiple files in a single request efficiently.

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class MultipleUploadController extends Controller
{
    /**
     * Upload multiple files at once.
     */
    public function uploadMultiple(Request $request)
    {
        $request->validate([
            // Validate the array and each file within it
            'files' => 'required|array|min:1|max:10',
            'files.*' => 'file|max:10240|mimes:jpeg,png,pdf,doc,docx',
        ]);

        $uploadedFiles = [];
        $errors = [];

        // Use database transaction for atomicity
        DB::beginTransaction();

        try {
            foreach ($request->file('files') as $index => $file) {
                // Store each file
                $path = $file->store('uploads/' . now()->format('Y/m'), 'public');

                // Save to database
                $uploadedFiles[] = [
                    'original_name' => $file->getClientOriginalName(),
                    'path' => $path,
                    'url' => Storage::disk('public')->url($path),
                    'size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                ];
            }

            DB::commit();

            return response()->json([
                'message' => 'Files uploaded successfully',
                'count' => count($uploadedFiles),
                'files' => $uploadedFiles,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            // Cleanup any files that were stored
            foreach ($uploadedFiles as $file) {
                Storage::disk('public')->delete($file['path']);
            }

            return response()->json([
                'error' => 'Upload failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upload files with individual metadata.
     */
    public function uploadWithMetadata(Request $request)
    {
        $request->validate([
            'files' => 'required|array|min:1|max:10',
            'files.*.file' => 'required|file|max:10240',
            'files.*.description' => 'nullable|string|max:500',
            'files.*.category' => 'required|string|in:document,image,video',
        ]);

        $results = [];

        foreach ($request->input('files') as $index => $fileData) {
            $file = $request->file("files.{$index}.file");

            // Organize by category
            $category = $fileData['category'];
            $path = $file->store("uploads/{$category}", 'public');

            $results[] = [
                'path' => $path,
                'url' => Storage::disk('public')->url($path),
                'description' => $fileData['description'] ?? null,
                'category' => $category,
                'original_name' => $file->getClientOriginalName(),
            ];
        }

        return response()->json([
            'message' => 'Files uploaded',
            'files' => $results,
        ]);
    }
}
```

### HTML Form for Multiple Uploads

```html
<!-- resources/views/multiple-upload.blade.php -->
<form action="/upload/multiple" method="POST" enctype="multipart/form-data">
    @csrf

    <!-- Allow selecting multiple files -->
    <input type="file" name="files[]" multiple accept=".jpg,.jpeg,.png,.pdf,.doc,.docx">

    <button type="submit">Upload Files</button>
</form>
```

---

## Testing File Uploads

Laravel provides utilities for testing file uploads without actually storing files.

### Feature Tests

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FileUploadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Use fake storage to prevent actual file operations
        Storage::fake('public');
        Storage::fake('local');
    }

    /** @test */
    public function user_can_upload_an_image(): void
    {
        $user = User::factory()->create();

        // Create a fake image file
        $file = UploadedFile::fake()->image('avatar.jpg', 400, 400);

        $response = $this->actingAs($user)
            ->post('/upload/avatar', [
                'avatar' => $file,
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'url',
            ]);

        // Assert the file was stored
        Storage::disk('public')->assertExists('avatars/' . $file->hashName());
    }

    /** @test */
    public function upload_validates_file_type(): void
    {
        $user = User::factory()->create();

        // Create a non-image file
        $file = UploadedFile::fake()->create('document.pdf', 1000, 'application/pdf');

        $response = $this->actingAs($user)
            ->post('/upload/avatar', [
                'avatar' => $file,
            ]);

        // Should fail validation
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['avatar']);
    }

    /** @test */
    public function upload_validates_file_size(): void
    {
        $user = User::factory()->create();

        // Create an oversized file (6MB when max is 5MB)
        $file = UploadedFile::fake()->image('large.jpg')->size(6000);

        $response = $this->actingAs($user)
            ->post('/upload/avatar', [
                'avatar' => $file,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['avatar']);
    }

    /** @test */
    public function upload_validates_image_dimensions(): void
    {
        $user = User::factory()->create();

        // Create an image that's too small
        $file = UploadedFile::fake()->image('tiny.jpg', 50, 50);

        $response = $this->actingAs($user)
            ->post('/upload/avatar', [
                'avatar' => $file,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['avatar']);
    }

    /** @test */
    public function user_can_upload_multiple_files(): void
    {
        $user = User::factory()->create();

        $files = [
            UploadedFile::fake()->image('photo1.jpg'),
            UploadedFile::fake()->image('photo2.jpg'),
            UploadedFile::fake()->create('doc.pdf', 500, 'application/pdf'),
        ];

        $response = $this->actingAs($user)
            ->post('/upload/multiple', [
                'files' => $files,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('count', 3);

        // Assert each file exists
        foreach ($files as $file) {
            Storage::disk('public')->assertExists('uploads/' . now()->format('Y/m') . '/' . $file->hashName());
        }
    }

    /** @test */
    public function user_can_download_their_own_file(): void
    {
        $user = User::factory()->create();

        // Create and store a file
        $file = UploadedFile::fake()->create('document.pdf', 1000);
        $path = $file->store('documents');

        $document = \App\Models\Document::create([
            'user_id' => $user->id,
            'path' => $path,
            'original_name' => 'document.pdf',
            'mime_type' => 'application/pdf',
            'size' => 1000,
        ]);

        $response = $this->actingAs($user)
            ->get("/documents/{$document->id}/download");

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'application/pdf');
    }

    /** @test */
    public function user_cannot_download_another_users_file(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();

        $document = \App\Models\Document::create([
            'user_id' => $owner->id,
            'path' => 'documents/secret.pdf',
            'original_name' => 'secret.pdf',
            'mime_type' => 'application/pdf',
            'size' => 1000,
        ]);

        $response = $this->actingAs($otherUser)
            ->get("/documents/{$document->id}/download");

        $response->assertStatus(403);
    }
}
```

---

## Best Practices Summary

1. **Always validate uploads** - Check file type, size, and dimensions. Use MIME type validation rather than just extensions.

2. **Use unique filenames** - Let Laravel generate hash names or use UUIDs to prevent overwrites and path traversal attacks.

3. **Separate public and private files** - Use the public disk only for files that should be web-accessible. Serve private files through authenticated routes.

4. **Configure cloud storage for production** - Use S3 or similar services for scalability, redundancy, and CDN integration.

5. **Implement chunked uploads for large files** - Break large files into chunks to work around server limits and provide better progress feedback.

6. **Process images efficiently** - Resize images on upload to reduce storage costs and improve load times. Generate multiple sizes if needed.

7. **Clean up temporary files** - Implement cleanup jobs for abandoned chunked uploads and temporary files.

8. **Use database transactions** - When storing multiple files with database records, wrap operations in transactions for atomicity.

9. **Test thoroughly** - Use Laravel's fake storage in tests to verify upload logic without creating actual files.

10. **Monitor storage usage** - Track disk space and set up alerts before running out of storage.

---

*Building a reliable monitoring setup for your Laravel application? [OneUptime](https://oneuptime.com) provides comprehensive monitoring including uptime checks, performance metrics, and alerting - helping you catch storage issues and upload failures before they impact users.*
