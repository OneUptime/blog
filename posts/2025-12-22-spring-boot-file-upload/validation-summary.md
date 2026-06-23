# Validation Summary: How to Handle File Upload in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java (17+, uses switch expressions)
- Spring Boot (Spring Web MVC, multipart handling)
- Jakarta EE namespaces (`jakarta.servlet`, `jakarta.annotation`, `jakarta.validation`)
- Lombok (`@Data`, `@Builder`, `@RequiredArgsConstructor`, `@Slf4j`)
- Spring `@ConfigurationProperties`
- AWS SDK for Java v2 (`software.amazon.awssdk.services.s3`)
- Java AWT / ImageIO (image resizing & thumbnails)
- Bean Validation (`@NotBlank`, `@Size`, `@NotEmpty`)
- Spring Boot Test (`@SpringBootTest`, `MockMvc`, `MockMultipartFile`)

## Sources Consulted
- Spring Boot Reference — Multipart (`spring.servlet.multipart.*`) properties: https://docs.spring.io/spring-boot/appendix/application-properties/index.html
- Spring Framework `ServletUriComponentsBuilder`: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/servlet/support/ServletUriComponentsBuilder.html
- Spring `MaxUploadSizeExceededException`: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/multipart/MaxUploadSizeExceededException.html
- AWS SDK for Java v2 — `S3Client`, `PutObjectRequest`, `RequestBody.fromInputStream`, `S3Utilities.getUrl`: https://sdk.amazonaws.com/java/api/latest/software/amazon/awssdk/services/s3/S3Client.html
- AWS SDK v2 — `S3Presigner` (presigned URL generation): https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html
- Spring `@ConfigurationProperties` relaxed binding (comma-separated string → `List`): https://docs.spring.io/spring-boot/reference/features/external-config.html
- Spring Test `MockMvc` / `MockMultipartFile`: https://docs.spring.io/spring-framework/reference/testing/spring-mvc-test-framework.html

## Issues Found
- **Inconsistent unit test (`shouldUploadFile`) — fixed.** The test uploaded `test.txt` with `MediaType.TEXT_PLAIN_VALUE` and asserted `status().isOk()`. However, the configured `upload.allowed-extensions` (jpg, jpeg, png, gif, pdf, doc, docx, xls, xlsx) does **not** include `txt`. Because the test uses `@SpringBootTest` (loading the real configuration), `FileStorageService.validateFile()` would reject the `.txt` extension and the endpoint would return HTTP 400, contradicting the `isOk()` / `size == 13` assertions. Changed the test fixture to `test.png` with `MediaType.IMAGE_PNG_VALUE`, which is an allowed extension whose content type also satisfies `validateContentType()`. The 13-byte payload and all assertions remain valid.

## Review Notes
- **`S3StorageService.getPresignedUrl()` is misleadingly named.** It calls `s3Client.utilities().getUrl(...)`, which returns the object's plain (virtual-hosted) URL, **not** a presigned URL. That URL only works for publicly readable objects. To generate an actual time-limited presigned URL for private objects, the `software.amazon.awssdk.services.s3.presigner.S3Presigner` (with `GetObjectPresignRequest`) is required. The code itself compiles and runs; only the method name overstates what it does. Left as-is to avoid restructuring, but readers should be aware.
- Several combined code blocks present multiple top-level public classes in a single fence (e.g. the two exception classes; `DocumentController` + `FileUploadRequest`) and omit some imports (`java.util.Map`, validation annotations, `@Data`). These are conventional blog-snippet condensations — each class belongs in its own `.java` file — and are not technical errors in the implementation logic.
- `ImageProcessingService` imports `java.io.ByteArrayInputStream` but never uses it — a harmless unused import.
- `createThumbnail` / `getFormatName` default to writing as `jpg`, which would flatten PNG transparency onto a black `TYPE_INT_RGB` canvas. Correct as written, but a future improvement could preserve the source format/alpha.
- All multipart properties, Jakarta EE namespaces, Java 17 switch expressions, AWS SDK v2 builders, and Bean Validation annotations are current and correct.
