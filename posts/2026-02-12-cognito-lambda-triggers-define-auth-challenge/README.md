# How to Use Cognito Lambda Triggers (Define Auth Challenge)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, Lambda, Authentication

Description: Learn how to use the Define Auth Challenge Lambda trigger in AWS Cognito to build custom authentication flows including CAPTCHA, OTP, and multi-step verification.

---

AWS Cognito's built-in authentication flows cover the basics well - username/password, SRP-based auth, and social logins all work without much effort. But what happens when you need something more custom? Maybe you want to add a CAPTCHA step, implement passwordless login with email OTP, or chain multiple verification methods together. That's where the Define Auth Challenge trigger comes in.

This trigger acts as the orchestrator for custom authentication flows. It decides what challenge to present next, whether the user has passed enough challenges, and when authentication is complete.

## How Custom Auth Flows Work

Custom authentication in Cognito is a three-trigger system. The Define Auth Challenge trigger is the brain of the operation. It works alongside two other triggers:

- **Define Auth Challenge** - decides which challenge to issue next (or declares auth complete)
- **Create Auth Challenge** - generates the challenge details (like an OTP code)
- **Verify Auth Challenge Response** - checks if the user's response is correct

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Cognito
    participant Define as Define Auth Challenge
    participant Create as Create Auth Challenge
    participant Verify as Verify Auth Challenge

    App->>Cognito: InitiateAuth (CUSTOM_AUTH)
    Cognito->>Define: What challenge next?
    Define->>Cognito: Issue CUSTOM_CHALLENGE
    Cognito->>Create: Generate challenge
    Create->>Cognito: Challenge metadata
    Cognito->>App: Challenge response needed
    App->>User: Show challenge
    User->>App: Enter response
    App->>Cognito: RespondToAuthChallenge
    Cognito->>Verify: Check answer
    Verify->>Cognito: Correct/Incorrect
    Cognito->>Define: What next?
    Define->>Cognito: Auth complete - issue tokens
    Cognito->>App: JWT tokens
```

## The Define Auth Challenge Event Structure

Let's look at what Cognito sends to your Define Auth Challenge Lambda. Understanding this structure is the foundation for building any custom flow.

Here's a typical event your Lambda receives:

```javascript
{
    "version": "1",
    "triggerSource": "DefineAuthChallenge_Authentication",
    "region": "us-east-1",
    "userPoolId": "us-east-1_XXXXXXXXX",
    "userName": "johndoe",
    "callerContext": {
        "awsSdkVersion": "aws-sdk-js-3.0",
        "clientId": "abc123"
    },
    "request": {
        "userAttributes": {
            "sub": "uuid-here",
            "email": "john@example.com"
        },
        "session": [
            {
                "challengeName": "CUSTOM_CHALLENGE",
                "challengeResult": true,
                "challengeMetadata": "OTP_CHALLENGE"
            }
        ],
        "userNotFound": false
    },
    "response": {
        "challengeName": null,
        "issueTokens": false,
        "failAuthentication": false
    }
}
```

The `session` array is key. It contains the history of all challenges that have been issued so far and whether the user passed them. Your Lambda reads this history and decides what happens next.

## Building a Simple OTP Flow

Let's start with a straightforward example: email-based OTP authentication with no password required.

This Lambda implements a single-step OTP challenge:

```javascript
exports.handler = async (event) => {
    const session = event.request.session;

    if (session.length === 0) {
        // No challenges yet - issue the first one
        event.response.challengeName = 'CUSTOM_CHALLENGE';
        event.response.issueTokens = false;
        event.response.failAuthentication = false;
    } else if (
        session.length === 1 &&
        session[0].challengeName === 'CUSTOM_CHALLENGE' &&
        session[0].challengeResult === true
    ) {
        // User passed the OTP challenge - authentication complete
        event.response.issueTokens = true;
        event.response.failAuthentication = false;
    } else {
        // User failed the challenge
        event.response.issueTokens = false;
        event.response.failAuthentication = true;
    }

    return event;
};
```

Simple, right? When the session is empty, issue a challenge. When the session shows a passed challenge, issue tokens. If anything else happens, fail the authentication.

## Multi-Step Authentication

Things get more interesting when you want multiple verification steps. Say you want the user to first verify with SRP (password) and then answer a custom challenge.

Here's a multi-step flow with password first, then OTP:

```javascript
exports.handler = async (event) => {
    const session = event.request.session;

    if (session.length === 0) {
        // Step 1: Start with SRP password verification
        event.response.challengeName = 'SRP_A';
        event.response.issueTokens = false;
        event.response.failAuthentication = false;
    } else if (
        session.length === 1 &&
        session[0].challengeName === 'SRP_A' &&
        session[0].challengeResult === true
    ) {
        // SRP step A passed, continue SRP flow
        event.response.challengeName = 'PASSWORD_VERIFIER';
        event.response.issueTokens = false;
        event.response.failAuthentication = false;
    } else if (
        session.length === 2 &&
        session[1].challengeName === 'PASSWORD_VERIFIER' &&
        session[1].challengeResult === true
    ) {
        // Password verified - now issue a custom OTP challenge
        event.response.challengeName = 'CUSTOM_CHALLENGE';
        event.response.issueTokens = false;
        event.response.failAuthentication = false;
    } else if (
        session.length === 3 &&
        session[2].challengeName === 'CUSTOM_CHALLENGE' &&
        session[2].challengeResult === true
    ) {
        // Both password and OTP passed - issue tokens
        event.response.issueTokens = true;
        event.response.failAuthentication = false;
    } else {
        // Something failed
        event.response.issueTokens = false;
        event.response.failAuthentication = true;
    }

    return event;
};
```

For more on building full custom authentication flows, check out [implementing custom authentication flows in Cognito](https://oneuptime.com/blog/post/2026-02-12-custom-authentication-flows-cognito/view).

## Allowing Retries

A strict flow that fails immediately after one wrong answer isn't great UX. You probably want to give users a few attempts at entering their OTP code.

This version allows up to three attempts before failing:

```javascript
exports.handler = async (event) => {
    const session = event.request.session;
    const MAX_ATTEMPTS = 3;

    // Count how many custom challenge attempts have been made
    const challengeAttempts = session.filter(
        s => s.challengeName === 'CUSTOM_CHALLENGE'
    );

    if (session.length === 0) {
        // First interaction - issue a challenge
        event.response.challengeName = 'CUSTOM_CHALLENGE';
        event.response.issueTokens = false;
        event.response.failAuthentication = false;
    } else if (challengeAttempts.length > 0) {
        const lastAttempt = challengeAttempts[challengeAttempts.length - 1];

        if (lastAttempt.challengeResult === true) {
            // Correct answer - issue tokens
            event.response.issueTokens = true;
            event.response.failAuthentication = false;
        } else if (challengeAttempts.length >= MAX_ATTEMPTS) {
            // Too many failed attempts
            event.response.issueTokens = false;
            event.response.failAuthentication = true;
        } else {
            // Wrong answer but retries remain - issue same challenge again
            event.response.challengeName = 'CUSTOM_CHALLENGE';
            event.response.issueTokens = false;
            event.response.failAuthentication = false;
        }
    } else {
        event.response.issueTokens = false;
        event.response.failAuthentication = true;
    }

    return event;
};
```

## Using Challenge Metadata

When you chain multiple types of custom challenges, challenge metadata helps you distinguish between them. The metadata is set by the Create Auth Challenge trigger and appears in the session history.

Here's how to use metadata to run different challenge types:

```javascript
exports.handler = async (event) => {
    const session = event.request.session;

    if (session.length === 0) {
        // First step: CAPTCHA verification
        event.response.challengeName = 'CUSTOM_CHALLENGE';
        event.response.issueTokens = false;
        event.response.failAuthentication = false;
    } else if (
        session.length === 1 &&
        session[0].challengeMetadata === 'CAPTCHA_CHALLENGE' &&
        session[0].challengeResult === true
    ) {
        // CAPTCHA passed, now send OTP
        event.response.challengeName = 'CUSTOM_CHALLENGE';
        event.response.issueTokens = false;
        event.response.failAuthentication = false;
    } else if (
        session.length === 2 &&
        session[1].challengeMetadata === 'OTP_CHALLENGE' &&
        session[1].challengeResult === true
    ) {
        // Both CAPTCHA and OTP passed
        event.response.issueTokens = true;
        event.response.failAuthentication = false;
    } else {
        event.response.issueTokens = false;
        event.response.failAuthentication = true;
    }

    return event;
};
```

## Initiating Custom Auth from the Client

On the client side, you need to use the `CUSTOM_AUTH` flow when calling Cognito.

Here's how to initiate a custom auth flow from a JavaScript application:

```javascript
const {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
    RespondToAuthChallengeCommand
} = require('@aws-sdk/client-cognito-identity-provider');

const client = new CognitoIdentityProviderClient({ region: 'us-east-1' });

// Start the custom auth flow
async function startCustomAuth(username) {
    const response = await client.send(new InitiateAuthCommand({
        AuthFlow: 'CUSTOM_AUTH',
        ClientId: 'your-app-client-id',
        AuthParameters: {
            USERNAME: username
        }
    }));

    // If a challenge is returned, handle it
    if (response.ChallengeName === 'CUSTOM_CHALLENGE') {
        console.log('Challenge issued:', response.ChallengeParameters);
        return response;
    }

    return response;
}

// Respond to the challenge
async function answerChallenge(session, username, answer) {
    const response = await client.send(new RespondToAuthChallengeCommand({
        ChallengeName: 'CUSTOM_CHALLENGE',
        ClientId: 'your-app-client-id',
        Session: session,
        ChallengeResponses: {
            USERNAME: username,
            ANSWER: answer
        }
    }));

    return response;
}
```

## Debugging Tips

Custom auth flows can be tricky to debug because the three triggers interact in subtle ways. Here are a few things that help:

1. **Log the full event** in each Lambda so you can see the session state.
2. **Check the session array length** - it tells you exactly where you are in the flow.
3. **Watch for SRP quirks** - if you include SRP in your flow, remember that it uses multiple internal steps (SRP_A and PASSWORD_VERIFIER) that each count as separate session entries.
4. **Test edge cases** - what happens when a user's session expires mid-flow? What about concurrent auth attempts?

Make sure you're monitoring these Lambda functions in production. Authentication failures that stem from trigger bugs can be hard to track down without proper logging and alerting.

## Wrapping Up

The Define Auth Challenge trigger is the control center for custom authentication in Cognito. It's where you decide the shape of your auth flow - how many steps, what kind of verification, how many retries, and when to hand out tokens. Combined with the Create and Verify triggers, you can build authentication experiences that go well beyond what Cognito offers out of the box. Start with a simple single-step flow, get comfortable with the session model, and build complexity from there.
