# How to Set Up Azure PlayFab for Player Authentication and Leaderboard Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure PlayFab, Game Development, Player Authentication, Leaderboards, Gaming, Backend Services, Identity Management

Description: Set up Azure PlayFab for player authentication with multiple identity providers and leaderboard management for competitive gaming features.

---

Building authentication and leaderboards from scratch for a game is a pain. You need to handle multiple login methods, link accounts, manage sessions, store scores, rank players, and deal with cheaters who submit fake scores. PlayFab handles all of this as a managed service, so you can focus on making the game fun instead of building backend plumbing.

PlayFab is part of the Azure ecosystem and provides backend services specifically designed for games. In this guide, I will walk through setting up player authentication with multiple providers and building a leaderboard system that supports ranking, seasons, and anti-cheat measures.

## Setting Up PlayFab

First, create a PlayFab account and title. A title in PlayFab terminology is your game project.

Go to the PlayFab developer portal at developer.playfab.com. Create a new studio, then create a title within it. Each title gets a unique Title ID that you will use in all API calls.

After creating the title, grab these credentials from the dashboard:
- Title ID (visible in the title settings)
- Developer Secret Key (under Settings > Secret Keys)

Never embed the secret key in your game client. It is for server-to-server calls only.

## Step 1 - Implement Basic Player Authentication

PlayFab supports multiple authentication methods. The simplest for getting started is custom ID login, which creates an anonymous player account tied to a device identifier.

Here is a Unity C# example for basic authentication.

```csharp
using PlayFab;
using PlayFab.ClientModels;
using UnityEngine;

public class PlayFabAuth : MonoBehaviour
{
    // Your PlayFab Title ID - set this in the editor or config
    private string titleId = "YOUR_TITLE_ID";

    void Start()
    {
        // Configure PlayFab settings
        PlayFabSettings.staticSettings.TitleId = titleId;

        // Log in with a device-specific custom ID
        LoginWithCustomID();
    }

    void LoginWithCustomID()
    {
        // Use SystemInfo.deviceUniqueIdentifier for a per-device anonymous login
        var request = new LoginWithCustomIDRequest
        {
            CustomId = SystemInfo.deviceUniqueIdentifier,
            CreateAccount = true,  // Create a new account if one does not exist
            InfoRequestParameters = new GetPlayerCombinedInfoRequestParams
            {
                GetPlayerProfile = true,  // Fetch profile data with the login response
                GetUserAccountInfo = true
            }
        };

        PlayFabClientAPI.LoginWithCustomID(
            request,
            OnLoginSuccess,
            OnLoginFailure
        );
    }

    void OnLoginSuccess(LoginResult result)
    {
        Debug.Log($"Login successful! Player ID: {result.PlayFabId}");
        Debug.Log($"New account: {result.NewlyCreated}");

        // Store the session ticket for subsequent API calls
        string sessionTicket = result.SessionTicket;

        // If the player has a display name, show it
        if (result.InfoResultPayload?.PlayerProfile != null)
        {
            string displayName = result.InfoResultPayload.PlayerProfile.DisplayName;
            Debug.Log($"Welcome back, {displayName}!");
        }
    }

    void OnLoginFailure(PlayFabError error)
    {
        Debug.LogError($"Login failed: {error.ErrorMessage}");
    }
}
```

Custom ID login is great for getting players in quickly, but you will want to offer real authentication methods so players can recover their accounts and play across devices.

## Step 2 - Add Platform-Specific Authentication

Most games support logging in with Google, Apple, Steam, or console platform accounts. Here is how to add Google Sign-In.

```csharp
public void LoginWithGoogle(string serverAuthCode)
{
    // The server auth code comes from Google Sign-In SDK
    var request = new LoginWithGoogleAccountRequest
    {
        ServerAuthCode = serverAuthCode,
        CreateAccount = true,
        InfoRequestParameters = new GetPlayerCombinedInfoRequestParams
        {
            GetPlayerProfile = true
        }
    };

    PlayFabClientAPI.LoginWithGoogleAccount(
        request,
        OnLoginSuccess,
        OnLoginFailure
    );
}

public void LoginWithApple(string identityToken)
{
    // The identity token comes from Apple Sign-In
    var request = new LoginWithAppleRequest
    {
        IdentityToken = identityToken,
        CreateAccount = true,
        InfoRequestParameters = new GetPlayerCombinedInfoRequestParams
        {
            GetPlayerProfile = true
        }
    };

    PlayFabClientAPI.LoginWithApple(
        request,
        OnLoginSuccess,
        OnLoginFailure
    );
}
```

## Step 3 - Link Multiple Accounts

Players often start with an anonymous login and later want to create a real account. Account linking lets them attach a Google or Apple identity to their existing anonymous account without losing progress.

```csharp
public void LinkGoogleAccount(string serverAuthCode)
{
    // Link Google identity to the currently logged-in player
    var request = new LinkGoogleAccountRequest
    {
        ServerAuthCode = serverAuthCode,
        ForceLink = false  // Do not overwrite if already linked to another player
    };

    PlayFabClientAPI.LinkGoogleAccount(
        request,
        result => Debug.Log("Google account linked successfully"),
        error =>
        {
            if (error.Error == PlayFabErrorCode.LinkedAccountAlreadyClaimed)
            {
                // Another player already claimed this Google account
                // Offer to merge accounts or switch
                Debug.LogWarning("This Google account is linked to another player");
                PromptAccountMerge();
            }
            else
            {
                Debug.LogError($"Link failed: {error.ErrorMessage}");
            }
        }
    );
}

void PromptAccountMerge()
{
    // Show UI asking the player if they want to switch to the existing account
    // or keep their current anonymous account
    Debug.Log("Show account merge dialog to the player");
}
```

The `ForceLink = false` setting is important. If set to true, it would unlink the Google account from whatever player it was previously associated with, which could cause data loss.

## Step 4 - Set Up Leaderboards

PlayFab leaderboards are straightforward to configure. You define a statistic, and PlayFab automatically ranks players based on their values.

In the PlayFab portal, go to Leaderboards and create a new leaderboard. Or use the admin API.

```csharp
// Server-side code to create a leaderboard definition
public void CreateLeaderboard()
{
    var request = new CreatePlayerStatisticDefinitionRequest
    {
        StatisticName = "HighScore",
        VersionChangeInterval = StatisticResetIntervalOption.Week  // Weekly reset for seasons
    };

    PlayFabServerAPI.CreatePlayerStatisticDefinition(
        request,
        result => Debug.Log("Leaderboard created"),
        error => Debug.LogError($"Failed: {error.ErrorMessage}")
    );
}
```

To submit a score from the game client, use the UpdatePlayerStatistics API.

```csharp
public void SubmitScore(int score)
{
    // Update the player's score on the leaderboard
    var request = new UpdatePlayerStatisticsRequest
    {
        Statistics = new List<StatisticUpdate>
        {
            new StatisticUpdate
            {
                StatisticName = "HighScore",
                Value = score
            }
        }
    };

    PlayFabClientAPI.UpdatePlayerStatistics(
        request,
        result => Debug.Log($"Score submitted: {score}"),
        error => Debug.LogError($"Score submission failed: {error.ErrorMessage}")
    );
}
```

By default, PlayFab keeps the maximum value. If a player submits a score of 500 and later submits 300, their leaderboard entry stays at 500. You can change this behavior in the leaderboard settings to keep the most recent value instead.

## Step 5 - Retrieve Leaderboard Data

There are several ways to fetch leaderboard data depending on what you need to display.

```csharp
public void GetTopPlayers(int count = 10)
{
    // Get the top players on the leaderboard
    var request = new GetLeaderboardRequest
    {
        StatisticName = "HighScore",
        StartPosition = 0,
        MaxResultsCount = count,
        ProfileConstraints = new PlayerProfileViewConstraints
        {
            ShowDisplayName = true,
            ShowAvatarUrl = true
        }
    };

    PlayFabClientAPI.GetLeaderboard(
        request,
        result =>
        {
            foreach (var entry in result.Leaderboard)
            {
                Debug.Log($"Rank {entry.Position + 1}: {entry.Profile.DisplayName} - {entry.StatValue}");
            }
        },
        error => Debug.LogError($"Failed: {error.ErrorMessage}")
    );
}

public void GetPlayerRank()
{
    // Get the current player's position and nearby players
    var request = new GetLeaderboardAroundPlayerRequest
    {
        StatisticName = "HighScore",
        MaxResultsCount = 11,  // 5 above, the player, 5 below
        ProfileConstraints = new PlayerProfileViewConstraints
        {
            ShowDisplayName = true
        }
    };

    PlayFabClientAPI.GetLeaderboardAroundPlayer(
        request,
        result =>
        {
            foreach (var entry in result.Leaderboard)
            {
                string marker = entry.PlayFabId == currentPlayerId ? " <-- YOU" : "";
                Debug.Log($"#{entry.Position + 1} {entry.Profile.DisplayName}: {entry.StatValue}{marker}");
            }
        },
        error => Debug.LogError($"Failed: {error.ErrorMessage}")
    );
}

public void GetFriendsLeaderboard()
{
    // Show scores of the player's friends only
    var request = new GetFriendLeaderboardRequest
    {
        StatisticName = "HighScore",
        MaxResultsCount = 20,
        ProfileConstraints = new PlayerProfileViewConstraints
        {
            ShowDisplayName = true
        }
    };

    PlayFabClientAPI.GetFriendLeaderboard(
        request,
        result =>
        {
            foreach (var entry in result.Leaderboard)
            {
                Debug.Log($"{entry.Profile.DisplayName}: {entry.StatValue}");
            }
        },
        error => Debug.LogError($"Failed: {error.ErrorMessage}")
    );
}
```

## Step 6 - Implement Server-Side Score Validation

Trusting the client to submit honest scores is a recipe for cheated leaderboards. Use PlayFab CloudScript or Azure Functions to validate scores server-side.

```javascript
// CloudScript function that validates and submits scores
handlers.ValidateAndSubmitScore = function (args, context) {
    var playerId = currentPlayerId;
    var submittedScore = args.score;
    var gameSessionId = args.sessionId;

    // Retrieve the game session data to verify the score is plausible
    var sessionData = server.GetUserData({
        PlayFabId: playerId,
        Keys: ["session_" + gameSessionId]
    });

    if (!sessionData.Data["session_" + gameSessionId]) {
        return { success: false, error: "Invalid session" };
    }

    var session = JSON.parse(sessionData.Data["session_" + gameSessionId].Value);

    // Basic validation checks
    var sessionDuration = (Date.now() - session.startTime) / 1000;  // seconds
    var maxPossibleScore = sessionDuration * 100;  // 100 points per second maximum

    if (submittedScore > maxPossibleScore) {
        // Score is impossibly high for the session duration
        log.info("Suspicious score detected for player " + playerId);
        return { success: false, error: "Score validation failed" };
    }

    // Score looks legitimate, submit it
    server.UpdatePlayerStatistics({
        PlayFabId: playerId,
        Statistics: [
            { StatisticName: "HighScore", Value: submittedScore }
        ]
    });

    return { success: true, score: submittedScore };
};
```

## Seasonal Leaderboards

PlayFab supports automatic leaderboard resets on daily, weekly, or monthly intervals. When a leaderboard resets, the previous version is preserved so you can still query historical rankings.

This is perfect for competitive seasons. At the end of each week or month, reward the top players, then the leaderboard resets and everyone starts fresh. Players who missed the top spots get a new chance, which keeps engagement high.

You can query historical versions of a leaderboard by specifying the version number in the request. This lets you build a "hall of fame" showing top players from each season.

## Wrapping Up

PlayFab takes the complexity out of game backend services. Authentication handles multiple providers and account linking out of the box. Leaderboards provide automatic ranking, seasonal resets, and friend comparisons without you managing any infrastructure. Add server-side score validation to keep your leaderboards clean, and you have a solid foundation for competitive features. The integration with Azure means you can extend PlayFab with Azure Functions, Cosmos DB, or any other Azure service when you need custom backend logic beyond what PlayFab provides natively.
