# How to Build a Notification Service with Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Notifications, Email, Push Notifications

Description: Learn how to build a flexible notification service in Spring Boot that handles email, SMS, and push notifications with retry logic, templating, and async processing.

---

Most applications need to notify users about something - a password reset, an order confirmation, a friend request. Building a notification service that handles multiple channels reliably is a common challenge. In this guide, we will build a production-ready notification service using Spring Boot that supports email, SMS, and push notifications.

## Project Setup

Start with the Spring Initializr or add these dependencies to your `pom.xml`:

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-mail</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-thymeleaf</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.retry</groupId>
        <artifactId>spring-retry</artifactId>
    </dependency>
</dependencies>
```

## Designing the Notification Model

First, define what a notification looks like. We need something flexible enough to handle different channels:

```java
// Notification.java
@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private NotificationType type;

    private String recipient;
    private String subject;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    private NotificationStatus status;

    private int retryCount;
    private LocalDateTime createdAt;
    private LocalDateTime sentAt;

    // Constructors, getters, setters
}

public enum NotificationType {
    EMAIL, SMS, PUSH
}

public enum NotificationStatus {
    PENDING, SENT, FAILED, RETRY
}
```

## Building the Notification Request DTO

Keep your API clean with a dedicated request object:

```java
// NotificationRequest.java
public class NotificationRequest {

    @NotNull
    private NotificationType type;

    @NotBlank
    private String recipient;

    private String subject;

    @NotBlank
    private String templateName;

    private Map<String, Object> templateVariables;

    // Getters and setters
}
```

## The Notification Service Interface

Define a common interface that all notification senders will implement. This makes it easy to add new channels later:

```java
// NotificationSender.java
public interface NotificationSender {

    // Each sender handles a specific type
    NotificationType getType();

    // Send the notification, throw exception on failure
    void send(Notification notification) throws NotificationException;
}
```

## Email Notification Sender

Email is the most common notification channel. Spring Boot makes it straightforward with the JavaMailSender:

```java
// EmailNotificationSender.java
@Component
public class EmailNotificationSender implements NotificationSender {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${notification.email.from}")
    private String fromAddress;

    public EmailNotificationSender(JavaMailSender mailSender,
                                   TemplateEngine templateEngine) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
    }

    @Override
    public NotificationType getType() {
        return NotificationType.EMAIL;
    }

    @Override
    public void send(Notification notification) throws NotificationException {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress);
            helper.setTo(notification.getRecipient());
            helper.setSubject(notification.getSubject());
            helper.setText(notification.getContent(), true); // HTML content

            mailSender.send(message);

        } catch (MessagingException e) {
            throw new NotificationException("Failed to send email", e);
        }
    }
}
```

## SMS Notification Sender

For SMS, you can integrate with services like Twilio. Here is a basic implementation:

```java
// SmsNotificationSender.java
@Component
public class SmsNotificationSender implements NotificationSender {

    @Value("${notification.sms.account-sid}")
    private String accountSid;

    @Value("${notification.sms.auth-token}")
    private String authToken;

    @Value("${notification.sms.from-number}")
    private String fromNumber;

    @Override
    public NotificationType getType() {
        return NotificationType.SMS;
    }

    @Override
    public void send(Notification notification) throws NotificationException {
        try {
            // Initialize Twilio client
            Twilio.init(accountSid, authToken);

            Message message = Message.creator(
                new PhoneNumber(notification.getRecipient()),
                new PhoneNumber(fromNumber),
                notification.getContent()
            ).create();

            if (message.getErrorCode() != null) {
                throw new NotificationException("SMS failed: " + message.getErrorMessage());
            }

        } catch (Exception e) {
            throw new NotificationException("Failed to send SMS", e);
        }
    }
}
```

## Push Notification Sender

For push notifications, Firebase Cloud Messaging is a popular choice:

```java
// PushNotificationSender.java
@Component
public class PushNotificationSender implements NotificationSender {

    private final FirebaseMessaging firebaseMessaging;

    public PushNotificationSender(FirebaseMessaging firebaseMessaging) {
        this.firebaseMessaging = firebaseMessaging;
    }

    @Override
    public NotificationType getType() {
        return NotificationType.PUSH;
    }

    @Override
    public void send(Notification notification) throws NotificationException {
        try {
            // The recipient field contains the device token
            Message message = Message.builder()
                .setToken(notification.getRecipient())
                .setNotification(com.google.firebase.messaging.Notification.builder()
                    .setTitle(notification.getSubject())
                    .setBody(notification.getContent())
                    .build())
                .build();

            firebaseMessaging.send(message);

        } catch (FirebaseMessagingException e) {
            throw new NotificationException("Failed to send push notification", e);
        }
    }
}
```

## The Main Notification Service

Now tie everything together. This service handles template processing, routing to the right sender, and retry logic:

```java
// NotificationService.java
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final TemplateEngine templateEngine;
    private final Map<NotificationType, NotificationSender> senders;

    // Spring injects all NotificationSender implementations
    public NotificationService(NotificationRepository notificationRepository,
                               TemplateEngine templateEngine,
                               List<NotificationSender> senderList) {
        this.notificationRepository = notificationRepository;
        this.templateEngine = templateEngine;

        // Build a map for quick lookup by type
        this.senders = senderList.stream()
            .collect(Collectors.toMap(
                NotificationSender::getType,
                Function.identity()
            ));
    }

    @Async
    public CompletableFuture<Notification> sendNotification(NotificationRequest request) {
        // Process template to generate content
        String content = processTemplate(request.getTemplateName(),
                                         request.getTemplateVariables());

        // Create notification record
        Notification notification = new Notification();
        notification.setType(request.getType());
        notification.setRecipient(request.getRecipient());
        notification.setSubject(request.getSubject());
        notification.setContent(content);
        notification.setStatus(NotificationStatus.PENDING);
        notification.setCreatedAt(LocalDateTime.now());

        notification = notificationRepository.save(notification);

        // Send it
        return sendWithRetry(notification);
    }

    @Retryable(
        value = NotificationException.class,
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    private CompletableFuture<Notification> sendWithRetry(Notification notification) {
        NotificationSender sender = senders.get(notification.getType());

        if (sender == null) {
            throw new IllegalArgumentException("No sender for type: " + notification.getType());
        }

        try {
            sender.send(notification);

            notification.setStatus(NotificationStatus.SENT);
            notification.setSentAt(LocalDateTime.now());
            log.info("Notification sent successfully: {}", notification.getId());

        } catch (NotificationException e) {
            notification.setRetryCount(notification.getRetryCount() + 1);
            notification.setStatus(NotificationStatus.RETRY);
            log.warn("Notification failed, will retry: {}", notification.getId(), e);
            throw e;
        }

        return CompletableFuture.completedFuture(notificationRepository.save(notification));
    }

    @Recover
    public CompletableFuture<Notification> recoverFromFailure(NotificationException e,
                                                              Notification notification) {
        log.error("Notification permanently failed after retries: {}", notification.getId());
        notification.setStatus(NotificationStatus.FAILED);
        return CompletableFuture.completedFuture(notificationRepository.save(notification));
    }

    private String processTemplate(String templateName, Map<String, Object> variables) {
        Context context = new Context();
        if (variables != null) {
            variables.forEach(context::setVariable);
        }
        return templateEngine.process(templateName, context);
    }
}
```

## REST Controller

Expose the notification service through a simple API:

```java
// NotificationController.java
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> send(@Valid @RequestBody NotificationRequest request) {
        CompletableFuture<Notification> future = notificationService.sendNotification(request);

        // Return immediately, notification sends in background
        Map<String, Object> response = new HashMap<>();
        response.put("status", "queued");
        response.put("message", "Notification will be sent shortly");

        return ResponseEntity.accepted().body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Notification> getStatus(@PathVariable Long id) {
        return notificationRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
```

## Configuration

Add the necessary configuration in `application.yml`:

```yaml
notification:
  email:
    from: noreply@yourapp.com
  sms:
    account-sid: ${TWILIO_ACCOUNT_SID}
    auth-token: ${TWILIO_AUTH_TOKEN}
    from-number: ${TWILIO_FROM_NUMBER}

spring:
  mail:
    host: smtp.gmail.com
    port: 587
    username: ${MAIL_USERNAME}
    password: ${MAIL_PASSWORD}
    properties:
      mail.smtp.auth: true
      mail.smtp.starttls.enable: true
```

## Email Templates

Create HTML templates in `src/main/resources/templates/`. Here is a sample welcome email:

```html
<!-- welcome.html -->
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<head>
    <meta charset="UTF-8">
</head>
<body>
    <h1>Welcome, <span th:text="${userName}">User</span>!</h1>
    <p>Thanks for signing up. We are excited to have you on board.</p>
    <a th:href="${activationLink}">Activate your account</a>
</body>
</html>
```

## Testing the Service

Write integration tests to verify the notification flow:

```java
@SpringBootTest
@AutoConfigureMockMvc
class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JavaMailSender mailSender;

    @Test
    void shouldQueueEmailNotification() throws Exception {
        String request = """
            {
                "type": "EMAIL",
                "recipient": "user@example.com",
                "subject": "Welcome!",
                "templateName": "welcome",
                "templateVariables": {
                    "userName": "John",
                    "activationLink": "https://app.com/activate/123"
                }
            }
            """;

        mockMvc.perform(post("/api/notifications")
                .contentType(MediaType.APPLICATION_JSON)
                .content(request))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.status").value("queued"));
    }
}
```

## Adding Message Queue Support

For high-volume scenarios, consider adding a message queue. Here is how you might integrate with RabbitMQ:

```java
// NotificationListener.java
@Component
public class NotificationListener {

    private final NotificationService notificationService;

    @RabbitListener(queues = "notification-queue")
    public void handleNotification(NotificationRequest request) {
        notificationService.sendNotification(request);
    }
}
```

This decouples the API from the actual sending, letting you handle traffic spikes gracefully.

## Summary

We built a notification service that supports multiple channels through a clean interface pattern. The service handles retries automatically, processes templates for personalized messages, and runs asynchronously so it does not block your main application. You can extend this foundation by adding more notification types, implementing user preferences for notification channels, or adding rate limiting to avoid overwhelming downstream services.

The key patterns here - the sender interface, async processing, and retry with exponential backoff - apply to any notification system regardless of the specific technologies you choose.
