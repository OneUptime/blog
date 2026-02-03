# How to Build Custom Artisan Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PHP, Laravel, Artisan, CLI, Commands

Description: Learn how to build custom Artisan commands in Laravel. This guide covers command creation, arguments, options, output formatting, and scheduling.

---

Artisan is Laravel's command-line interface that ships with dozens of helpful commands for database migrations, queue workers, cache clearing, and more. But the real power comes when you build your own commands tailored to your application's specific needs.

Custom Artisan commands are perfect for data imports, report generation, cleanup tasks, system health checks, and any operation that needs to run from the terminal or on a schedule.

## Generating a New Command

Laravel provides an Artisan command to generate new commands. This creates a boilerplate class with the proper structure.

```bash
php artisan make:command SendWeeklyReport
```

This creates a file at `app/Console/Commands/SendWeeklyReport.php`:

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class SendWeeklyReport extends Command
{
    /**
     * The name and signature of the console command.
     * This defines how users will invoke your command.
     *
     * @var string
     */
    protected $signature = 'command:name';

    /**
     * The console command description.
     * Appears when users run php artisan list.
     *
     * @var string
     */
    protected $description = 'Command description';

    /**
     * Execute the console command.
     * All your command logic goes here.
     */
    public function handle()
    {
        //
    }
}
```

## Understanding Command Signatures

The signature property defines your command's name, arguments, and options. This is where you specify what input your command accepts.

### Basic Signature

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class GreetUser extends Command
{
    // Simple command name with no arguments or options
    protected $signature = 'app:greet';

    protected $description = 'Display a greeting message';

    public function handle()
    {
        $this->info('Hello from the command line!');
    }
}
```

Run it with:

```bash
php artisan app:greet
```

### Commands with Arguments

Arguments are positional parameters that users must provide (unless marked optional).

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class SendEmailToUser extends Command
{
    /**
     * {user} - Required argument for user ID
     * {message} - Required argument for the message content
     */
    protected $signature = 'email:send {user} {message}';

    protected $description = 'Send an email to a specific user';

    public function handle()
    {
        // Retrieve argument values using the argument() method
        $userId = $this->argument('user');
        $message = $this->argument('message');

        $user = User::findOrFail($userId);

        // Send the email (implementation depends on your mail setup)
        Mail::to($user->email)->send(new GenericMessage($message));

        $this->info("Email sent to {$user->name} ({$user->email})");
    }
}
```

Usage:

```bash
php artisan email:send 42 "Your account has been updated"
```

### Optional Arguments with Default Values

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class ExportUsers extends Command
{
    /**
     * {format?} - Optional argument (note the ?)
     * {format=csv} - Optional with default value
     */
    protected $signature = 'users:export {format=csv}';

    protected $description = 'Export users to a file';

    public function handle()
    {
        $format = $this->argument('format');

        $this->info("Exporting users as {$format}...");

        $users = User::all();

        switch ($format) {
            case 'csv':
                $this->exportToCsv($users);
                break;
            case 'json':
                $this->exportToJson($users);
                break;
            case 'xml':
                $this->exportToXml($users);
                break;
            default:
                $this->error("Unknown format: {$format}");
                return 1; // Return non-zero to indicate failure
        }

        return 0; // Success
    }

    private function exportToCsv($users)
    {
        $filename = storage_path('exports/users.csv');

        $handle = fopen($filename, 'w');

        // Write header row
        fputcsv($handle, ['ID', 'Name', 'Email', 'Created At']);

        // Write data rows
        foreach ($users as $user) {
            fputcsv($handle, [
                $user->id,
                $user->name,
                $user->email,
                $user->created_at->toDateTimeString(),
            ]);
        }

        fclose($handle);

        $this->info("Exported to {$filename}");
    }

    private function exportToJson($users)
    {
        $filename = storage_path('exports/users.json');

        file_put_contents(
            $filename,
            $users->toJson(JSON_PRETTY_PRINT)
        );

        $this->info("Exported to {$filename}");
    }

    private function exportToXml($users)
    {
        // XML export implementation
        $this->info('XML export completed');
    }
}
```

### Array Arguments

When you need to accept multiple values for a single argument:

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class DeleteUsers extends Command
{
    /**
     * {users*} - Array argument, accepts multiple values
     * Users can pass multiple IDs separated by spaces
     */
    protected $signature = 'users:delete {users*}';

    protected $description = 'Delete multiple users by ID';

    public function handle()
    {
        // argument() returns an array when using the * modifier
        $userIds = $this->argument('users');

        if (empty($userIds)) {
            $this->error('Please provide at least one user ID');
            return 1;
        }

        $this->warn('You are about to delete ' . count($userIds) . ' users.');

        if (!$this->confirm('Do you want to continue?')) {
            $this->info('Operation cancelled.');
            return 0;
        }

        $deleted = 0;

        foreach ($userIds as $userId) {
            $user = User::find($userId);

            if ($user) {
                $user->delete();
                $this->line("Deleted user: {$user->name} (ID: {$userId})");
                $deleted++;
            } else {
                $this->warn("User not found: ID {$userId}");
            }
        }

        $this->info("Deleted {$deleted} users.");

        return 0;
    }
}
```

Usage:

```bash
php artisan users:delete 1 5 12 27
```

## Working with Options

Options are flags that modify command behavior. They start with double dashes.

### Boolean Options (Flags)

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class CleanupInactiveUsers extends Command
{
    /**
     * --dry-run - Boolean flag, no value needed
     * --force - Another boolean flag
     */
    protected $signature = 'users:cleanup
                            {--dry-run : Show what would be deleted without actually deleting}
                            {--force : Skip confirmation prompt}';

    protected $description = 'Remove users who have not logged in for over a year';

    public function handle()
    {
        // option() returns true/false for boolean flags
        $dryRun = $this->option('dry-run');
        $force = $this->option('force');

        $cutoffDate = now()->subYear();

        $inactiveUsers = User::where('last_login_at', '<', $cutoffDate)
            ->orWhereNull('last_login_at')
            ->get();

        $count = $inactiveUsers->count();

        if ($count === 0) {
            $this->info('No inactive users found.');
            return 0;
        }

        $this->info("Found {$count} inactive users.");

        if ($dryRun) {
            $this->warn('DRY RUN MODE - No changes will be made');

            // Display what would happen
            $this->table(
                ['ID', 'Name', 'Email', 'Last Login'],
                $inactiveUsers->map(function ($user) {
                    return [
                        $user->id,
                        $user->name,
                        $user->email,
                        $user->last_login_at ?? 'Never',
                    ];
                })
            );

            return 0;
        }

        // Confirm unless --force is used
        if (!$force && !$this->confirm("Delete {$count} users?")) {
            $this->info('Operation cancelled.');
            return 0;
        }

        // Perform deletion
        foreach ($inactiveUsers as $user) {
            $user->delete();
            $this->line("Deleted: {$user->email}");
        }

        $this->info("Successfully deleted {$count} users.");

        return 0;
    }
}
```

Usage:

```bash
# Preview what would be deleted
php artisan users:cleanup --dry-run

# Delete with confirmation
php artisan users:cleanup

# Delete without confirmation
php artisan users:cleanup --force
```

### Options with Values

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Order;

class GenerateSalesReport extends Command
{
    /**
     * --start= - Option requiring a value
     * --end= - Another option with required value
     * --format=pdf - Option with default value
     * -o|--output= - Option with shortcut
     */
    protected $signature = 'report:sales
                            {--start= : Start date (YYYY-MM-DD)}
                            {--end= : End date (YYYY-MM-DD)}
                            {--format=pdf : Output format (pdf, csv, html)}
                            {--o|output= : Output file path}';

    protected $description = 'Generate a sales report for a date range';

    public function handle()
    {
        // Get option values
        $startDate = $this->option('start');
        $endDate = $this->option('end');
        $format = $this->option('format');
        $outputPath = $this->option('output');

        // Validate dates
        if (!$startDate || !$endDate) {
            $this->error('Both --start and --end dates are required.');
            $this->line('Example: php artisan report:sales --start=2024-01-01 --end=2024-01-31');
            return 1;
        }

        try {
            $start = \Carbon\Carbon::parse($startDate)->startOfDay();
            $end = \Carbon\Carbon::parse($endDate)->endOfDay();
        } catch (\Exception $e) {
            $this->error('Invalid date format. Please use YYYY-MM-DD.');
            return 1;
        }

        if ($start->gt($end)) {
            $this->error('Start date must be before end date.');
            return 1;
        }

        $this->info("Generating sales report from {$start->toDateString()} to {$end->toDateString()}");

        // Fetch orders
        $orders = Order::whereBetween('created_at', [$start, $end])
            ->with('items', 'customer')
            ->get();

        $this->info("Found {$orders->count()} orders.");

        // Calculate totals
        $totalRevenue = $orders->sum('total');
        $averageOrderValue = $orders->avg('total');

        $this->newLine();
        $this->line("Total Revenue: $" . number_format($totalRevenue, 2));
        $this->line("Average Order Value: $" . number_format($averageOrderValue, 2));
        $this->line("Total Orders: {$orders->count()}");

        // Generate file if output path specified
        if ($outputPath) {
            $this->generateFile($orders, $format, $outputPath);
        }

        return 0;
    }

    private function generateFile($orders, $format, $path)
    {
        // File generation logic based on format
        $this->info("Report saved to: {$path}");
    }
}
```

Usage:

```bash
# Basic usage
php artisan report:sales --start=2024-01-01 --end=2024-01-31

# With format and output
php artisan report:sales --start=2024-01-01 --end=2024-01-31 --format=csv -o=/tmp/report.csv

# Using the long form of output
php artisan report:sales --start=2024-01-01 --end=2024-01-31 --output=/tmp/report.pdf
```

### Array Options

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Notifications\BulkNotification;

class NotifyUsers extends Command
{
    /**
     * --role=* - Array option, can be passed multiple times
     * --channel=* - Another array option
     */
    protected $signature = 'users:notify
                            {message : The notification message}
                            {--role=* : User roles to notify (can specify multiple)}
                            {--channel=* : Notification channels (mail, sms, slack)}';

    protected $description = 'Send a notification to users by role';

    public function handle()
    {
        $message = $this->argument('message');
        $roles = $this->option('role');
        $channels = $this->option('channel');

        // Default to mail if no channels specified
        if (empty($channels)) {
            $channels = ['mail'];
        }

        // Build query
        $query = User::query();

        if (!empty($roles)) {
            $query->whereIn('role', $roles);
        }

        $users = $query->get();

        if ($users->isEmpty()) {
            $this->warn('No users found matching the criteria.');
            return 0;
        }

        $this->info("Sending notification to {$users->count()} users via: " . implode(', ', $channels));

        foreach ($users as $user) {
            $user->notify(new BulkNotification($message, $channels));
            $this->line("Notified: {$user->email}");
        }

        $this->info('Notifications sent successfully!');

        return 0;
    }
}
```

Usage:

```bash
# Notify admins via email
php artisan users:notify "System maintenance tonight" --role=admin

# Notify multiple roles via multiple channels
php artisan users:notify "New feature released!" --role=admin --role=manager --channel=mail --channel=slack
```

## Input Descriptions

Add descriptions to make your command self-documenting:

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ProcessQueue extends Command
{
    protected $signature = 'queue:process
                            {queue : The name of the queue to process}
                            {--timeout=60 : Maximum seconds a job can run}
                            {--tries=3 : Number of times to attempt a failed job}
                            {--memory=128 : Memory limit in megabytes}
                            {--sleep=3 : Seconds to wait when no jobs available}';

    protected $description = 'Process jobs from a specific queue with custom settings';

    public function handle()
    {
        // Command implementation
    }
}
```

When users run `php artisan help queue:process`, they see all arguments and options with their descriptions.

## Command Output

Laravel provides several methods for outputting information to the terminal.

### Basic Output Methods

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class OutputDemo extends Command
{
    protected $signature = 'demo:output';
    protected $description = 'Demonstrate various output methods';

    public function handle()
    {
        // Basic line output - no special formatting
        $this->line('This is a plain line of text.');

        // Info - green text for success messages
        $this->info('Operation completed successfully!');

        // Comment - yellow text for notes or secondary info
        $this->comment('This is a comment or note.');

        // Question - black text on cyan background
        $this->question('Is this a question?');

        // Error - white text on red background
        $this->error('Something went wrong!');

        // Warning - yellow background (Laravel 8+)
        $this->warn('This is a warning message.');

        // New line - add blank lines
        $this->newLine();
        $this->newLine(2); // Add 2 blank lines

        // Combining with styles
        $this->line('<info>Green</info> and <comment>Yellow</comment> in one line');
        $this->line('<error>Error style</error> inline');
    }
}
```

### Tables

Display tabular data cleanly:

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class ListUsers extends Command
{
    protected $signature = 'users:list
                            {--role= : Filter by role}
                            {--limit=20 : Number of users to show}';

    protected $description = 'List users in a formatted table';

    public function handle()
    {
        $query = User::query()
            ->select('id', 'name', 'email', 'role', 'created_at');

        if ($role = $this->option('role')) {
            $query->where('role', $role);
        }

        $users = $query->limit($this->option('limit'))->get();

        if ($users->isEmpty()) {
            $this->info('No users found.');
            return 0;
        }

        // Simple table with headers and rows
        $this->table(
            ['ID', 'Name', 'Email', 'Role', 'Registered'],
            $users->map(function ($user) {
                return [
                    $user->id,
                    $user->name,
                    $user->email,
                    ucfirst($user->role),
                    $user->created_at->diffForHumans(),
                ];
            })
        );

        $this->newLine();
        $this->info("Showing {$users->count()} users.");

        return 0;
    }
}
```

Output:

```
+----+----------------+------------------------+--------+-------------+
| ID | Name           | Email                  | Role   | Registered  |
+----+----------------+------------------------+--------+-------------+
| 1  | John Doe       | john@example.com       | Admin  | 2 years ago |
| 2  | Jane Smith     | jane@example.com       | User   | 1 year ago  |
| 3  | Bob Johnson    | bob@example.com        | User   | 6 months ago|
+----+----------------+------------------------+--------+-------------+
```

## Progress Bars

For long-running operations, progress bars keep users informed:

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Services\DataEnricher;

class EnrichUserData extends Command
{
    protected $signature = 'users:enrich
                            {--batch=100 : Process users in batches of this size}';

    protected $description = 'Enrich user profiles with external data';

    public function handle(DataEnricher $enricher)
    {
        $totalUsers = User::count();

        if ($totalUsers === 0) {
            $this->info('No users to process.');
            return 0;
        }

        $this->info("Processing {$totalUsers} users...");
        $this->newLine();

        // Create a progress bar
        $bar = $this->output->createProgressBar($totalUsers);

        // Customize the format
        $bar->setFormat(' %current%/%max% [%bar%] %percent:3s%% - %message%');
        $bar->setMessage('Starting...');

        // Start the progress bar
        $bar->start();

        $batchSize = $this->option('batch');
        $processed = 0;
        $errors = 0;

        // Process in chunks to save memory
        User::chunk($batchSize, function ($users) use ($bar, $enricher, &$processed, &$errors) {
            foreach ($users as $user) {
                $bar->setMessage("Processing: {$user->email}");

                try {
                    $enricher->enrichUser($user);
                    $processed++;
                } catch (\Exception $e) {
                    $errors++;
                    // Log the error but continue processing
                }

                // Advance the progress bar
                $bar->advance();
            }
        });

        // Finish the progress bar
        $bar->setMessage('Complete!');
        $bar->finish();

        $this->newLine(2);

        $this->info("Processed: {$processed} users");

        if ($errors > 0) {
            $this->warn("Errors: {$errors} users failed to process");
        }

        return 0;
    }
}
```

### Using withProgressBar Helper

Laravel provides a simpler helper for common progress bar use cases:

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Product;

class RecalculatePrices extends Command
{
    protected $signature = 'products:recalculate-prices';
    protected $description = 'Recalculate all product prices based on current rules';

    public function handle()
    {
        $products = Product::all();

        $this->info("Recalculating prices for {$products->count()} products...");

        // withProgressBar handles creation, advancing, and finishing
        $this->withProgressBar($products, function ($product) {
            $product->recalculatePrice();
            $product->save();
        });

        $this->newLine(2);
        $this->info('Price recalculation complete!');

        return 0;
    }
}
```

## Interactive Input

### Asking Questions

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class CreateUser extends Command
{
    protected $signature = 'users:create';
    protected $description = 'Create a new user interactively';

    public function handle()
    {
        $this->info('Creating a new user...');
        $this->newLine();

        // Ask for text input
        $name = $this->ask('What is the user\'s name?');

        // Ask with a default value
        $email = $this->ask('What is their email address?', 'user@example.com');

        // Hidden input for sensitive data
        $password = $this->secret('Enter a password');

        // Ask with auto-completion suggestions
        $role = $this->anticipate(
            'What role should this user have?',
            ['admin', 'editor', 'user', 'guest']
        );

        // Multiple choice selection
        $department = $this->choice(
            'Which department?',
            ['Engineering', 'Marketing', 'Sales', 'Support'],
            0 // Default to first option
        );

        // Confirmation
        if (!$this->confirm("Create user {$name} ({$email}) as {$role}?", true)) {
            $this->info('User creation cancelled.');
            return 0;
        }

        // Create the user
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => bcrypt($password),
            'role' => $role,
            'department' => $department,
        ]);

        $this->info("User created successfully!");

        $this->table(
            ['ID', 'Name', 'Email', 'Role', 'Department'],
            [[$user->id, $user->name, $user->email, $user->role, $user->department]]
        );

        return 0;
    }
}
```

### Choice with Multiple Selection

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ConfigureNotifications extends Command
{
    protected $signature = 'notifications:configure';
    protected $description = 'Configure notification channels';

    public function handle()
    {
        // Allow multiple selections
        $channels = $this->choice(
            'Select notification channels (comma-separated for multiple)',
            ['email', 'sms', 'slack', 'push'],
            null,      // No default
            null,      // Max attempts
            true       // Allow multiple selections
        );

        $this->info('Selected channels: ' . implode(', ', $channels));

        return 0;
    }
}
```

## Calling Other Commands

Commands can invoke other commands:

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class DeployApplication extends Command
{
    protected $signature = 'deploy
                            {--force : Run without confirmation}';

    protected $description = 'Run all deployment tasks';

    public function handle()
    {
        if (!$this->option('force') && !$this->confirm('Start deployment?')) {
            return 0;
        }

        $this->info('Starting deployment...');
        $this->newLine();

        // Call another Artisan command
        $this->call('migrate', [
            '--force' => true,
        ]);

        // Call silently (no output)
        $this->callSilently('config:cache');
        $this->callSilently('route:cache');
        $this->callSilently('view:cache');

        // Call with specific options
        $this->call('queue:restart');

        $this->newLine();
        $this->info('Deployment complete!');

        return 0;
    }
}
```

## Exit Codes

Return meaningful exit codes for scripting and CI/CD:

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\HealthChecker;

class HealthCheck extends Command
{
    // Define exit code constants for clarity
    const SUCCESS = 0;
    const FAILURE = 1;
    const WARNING = 2;

    protected $signature = 'health:check';
    protected $description = 'Check application health status';

    public function handle(HealthChecker $checker)
    {
        $results = $checker->runAllChecks();

        $hasFailures = false;
        $hasWarnings = false;

        foreach ($results as $check => $result) {
            if ($result['status'] === 'fail') {
                $this->error("[FAIL] {$check}: {$result['message']}");
                $hasFailures = true;
            } elseif ($result['status'] === 'warn') {
                $this->warn("[WARN] {$check}: {$result['message']}");
                $hasWarnings = true;
            } else {
                $this->info("[OK] {$check}: {$result['message']}");
            }
        }

        $this->newLine();

        if ($hasFailures) {
            $this->error('Health check failed!');
            return self::FAILURE;
        }

        if ($hasWarnings) {
            $this->warn('Health check passed with warnings.');
            return self::WARNING;
        }

        $this->info('All health checks passed!');
        return self::SUCCESS;
    }
}
```

## Scheduling Commands

Laravel's task scheduler lets you run commands on a schedule defined in code rather than crontab.

### Registering Scheduled Commands

In `app/Console/Kernel.php`:

```php
<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule)
    {
        // Run every minute
        $schedule->command('queue:work --stop-when-empty')
            ->everyMinute()
            ->withoutOverlapping();

        // Run daily at midnight
        $schedule->command('users:cleanup --force')
            ->daily()
            ->at('00:00')
            ->emailOutputOnFailure('admin@example.com');

        // Run weekly on Sunday at 2 AM
        $schedule->command('report:weekly')
            ->weeklyOn(0, '02:00')
            ->timezone('America/New_York');

        // Run every 15 minutes during business hours
        $schedule->command('sync:inventory')
            ->everyFifteenMinutes()
            ->between('08:00', '18:00')
            ->weekdays();

        // Run monthly on the first day
        $schedule->command('billing:generate-invoices')
            ->monthly()
            ->onFirstDayOfMonth()
            ->at('06:00');

        // Run with custom cron expression
        $schedule->command('custom:task')
            ->cron('0 */4 * * *'); // Every 4 hours

        // Conditional scheduling
        $schedule->command('backup:database')
            ->daily()
            ->at('03:00')
            ->when(function () {
                return config('app.env') === 'production';
            });

        // Prevent overlapping for long-running commands
        $schedule->command('report:large')
            ->hourly()
            ->withoutOverlapping(30); // Lock expires after 30 minutes

        // Run in maintenance mode
        $schedule->command('health:check')
            ->everyFiveMinutes()
            ->evenInMaintenanceMode();

        // Output handling
        $schedule->command('data:import')
            ->daily()
            ->appendOutputTo(storage_path('logs/import.log'))
            ->onSuccess(function () {
                // Send success notification
            })
            ->onFailure(function () {
                // Send failure alert
            });
    }

    /**
     * Register the commands for the application.
     */
    protected function commands()
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
```

### Running the Scheduler

Add this single cron entry to your server:

```bash
* * * * * cd /path-to-your-project && php artisan schedule:run >> /dev/null 2>&1
```

This runs every minute and Laravel determines which scheduled tasks to execute.

### Testing Your Schedule

```bash
# List all scheduled commands
php artisan schedule:list

# Run the scheduler once (for testing)
php artisan schedule:run

# See what would run without executing
php artisan schedule:test
```

## Real-World Example: Data Import Command

Here is a complete example of a production-ready import command:

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use App\Models\Product;
use App\Jobs\ProcessImportedProduct;

class ImportProducts extends Command
{
    protected $signature = 'products:import
                            {file : Path to the CSV file}
                            {--queue : Process in background via queue}
                            {--dry-run : Validate without importing}
                            {--skip-validation : Skip row validation}
                            {--batch=500 : Number of records per batch}
                            {--update-existing : Update products if they already exist}';

    protected $description = 'Import products from a CSV file';

    private $errors = [];
    private $imported = 0;
    private $updated = 0;
    private $skipped = 0;

    public function handle()
    {
        $filePath = $this->argument('file');
        $isDryRun = $this->option('dry-run');
        $useQueue = $this->option('queue');
        $skipValidation = $this->option('skip-validation');
        $batchSize = (int) $this->option('batch');
        $updateExisting = $this->option('update-existing');

        // Validate file exists
        if (!file_exists($filePath)) {
            $this->error("File not found: {$filePath}");
            return 1;
        }

        $this->info("Importing products from: {$filePath}");

        if ($isDryRun) {
            $this->warn('DRY RUN MODE - No changes will be saved');
        }

        // Read and parse CSV
        $rows = $this->parseCSV($filePath);
        $totalRows = count($rows);

        if ($totalRows === 0) {
            $this->warn('No data rows found in file.');
            return 0;
        }

        $this->info("Found {$totalRows} products to import.");
        $this->newLine();

        // Create progress bar
        $bar = $this->output->createProgressBar($totalRows);
        $bar->setFormat(' %current%/%max% [%bar%] %percent:3s%% %elapsed:6s%/%estimated:-6s%');
        $bar->start();

        // Process in batches
        $batches = array_chunk($rows, $batchSize);

        foreach ($batches as $batch) {
            if ($isDryRun) {
                $this->processBatchDryRun($batch, $skipValidation, $bar);
            } elseif ($useQueue) {
                $this->queueBatch($batch);
                foreach ($batch as $row) {
                    $bar->advance();
                }
            } else {
                $this->processBatch($batch, $skipValidation, $updateExisting, $bar);
            }
        }

        $bar->finish();
        $this->newLine(2);

        // Display summary
        $this->displaySummary($isDryRun);

        // Display errors if any
        if (!empty($this->errors)) {
            $this->displayErrors();
        }

        return empty($this->errors) ? 0 : 1;
    }

    private function parseCSV(string $filePath): array
    {
        $rows = [];
        $handle = fopen($filePath, 'r');

        // Read header row
        $headers = fgetcsv($handle);
        $headers = array_map('strtolower', $headers);
        $headers = array_map('trim', $headers);

        // Read data rows
        while (($row = fgetcsv($handle)) !== false) {
            if (count($row) === count($headers)) {
                $rows[] = array_combine($headers, $row);
            }
        }

        fclose($handle);

        return $rows;
    }

    private function validateRow(array $row, int $lineNumber): bool
    {
        $requiredFields = ['sku', 'name', 'price'];

        foreach ($requiredFields as $field) {
            if (empty($row[$field])) {
                $this->errors[] = "Line {$lineNumber}: Missing required field '{$field}'";
                return false;
            }
        }

        if (!is_numeric($row['price']) || $row['price'] < 0) {
            $this->errors[] = "Line {$lineNumber}: Invalid price '{$row['price']}'";
            return false;
        }

        return true;
    }

    private function processBatch(array $batch, bool $skipValidation, bool $updateExisting, $bar)
    {
        DB::beginTransaction();

        try {
            foreach ($batch as $index => $row) {
                $lineNumber = $index + 2; // Account for header row

                if (!$skipValidation && !$this->validateRow($row, $lineNumber)) {
                    $this->skipped++;
                    $bar->advance();
                    continue;
                }

                $existing = Product::where('sku', $row['sku'])->first();

                if ($existing) {
                    if ($updateExisting) {
                        $existing->update([
                            'name' => $row['name'],
                            'price' => $row['price'],
                            'description' => $row['description'] ?? null,
                            'category' => $row['category'] ?? null,
                        ]);
                        $this->updated++;
                    } else {
                        $this->skipped++;
                    }
                } else {
                    Product::create([
                        'sku' => $row['sku'],
                        'name' => $row['name'],
                        'price' => $row['price'],
                        'description' => $row['description'] ?? null,
                        'category' => $row['category'] ?? null,
                    ]);
                    $this->imported++;
                }

                $bar->advance();
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            $this->errors[] = "Batch failed: {$e->getMessage()}";
            Log::error('Product import batch failed', [
                'exception' => $e->getMessage(),
            ]);
        }
    }

    private function processBatchDryRun(array $batch, bool $skipValidation, $bar)
    {
        foreach ($batch as $index => $row) {
            $lineNumber = $index + 2;

            if (!$skipValidation) {
                $this->validateRow($row, $lineNumber);
            }

            $existing = Product::where('sku', $row['sku'])->exists();

            if ($existing) {
                $this->skipped++;
            } else {
                $this->imported++;
            }

            $bar->advance();
        }
    }

    private function queueBatch(array $batch)
    {
        foreach ($batch as $row) {
            ProcessImportedProduct::dispatch($row);
        }

        $this->imported += count($batch);
    }

    private function displaySummary(bool $isDryRun)
    {
        $prefix = $isDryRun ? 'Would be ' : '';

        $this->info('Import Summary:');
        $this->table(
            ['Metric', 'Count'],
            [
                ["{$prefix}Imported", $this->imported],
                ["{$prefix}Updated", $this->updated],
                ["{$prefix}Skipped", $this->skipped],
                ['Errors', count($this->errors)],
            ]
        );
    }

    private function displayErrors()
    {
        $this->newLine();
        $this->error('Errors encountered:');

        // Show first 10 errors
        $displayErrors = array_slice($this->errors, 0, 10);

        foreach ($displayErrors as $error) {
            $this->line("  - {$error}");
        }

        if (count($this->errors) > 10) {
            $remaining = count($this->errors) - 10;
            $this->line("  ... and {$remaining} more errors");
        }
    }
}
```

Usage:

```bash
# Basic import
php artisan products:import /path/to/products.csv

# Dry run to test first
php artisan products:import /path/to/products.csv --dry-run

# Import via queue for large files
php artisan products:import /path/to/products.csv --queue

# Update existing products
php artisan products:import /path/to/products.csv --update-existing

# Combine options
php artisan products:import /path/to/products.csv --update-existing --batch=1000
```

## Testing Your Commands

Write tests for your commands using Laravel's testing utilities:

```php
<?php

namespace Tests\Feature\Commands;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CleanupUsersCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_identifies_inactive_users()
    {
        // Create an inactive user
        $inactiveUser = User::factory()->create([
            'last_login_at' => now()->subMonths(18),
        ]);

        // Create an active user
        $activeUser = User::factory()->create([
            'last_login_at' => now()->subDays(5),
        ]);

        // Run command in dry-run mode
        $this->artisan('users:cleanup', ['--dry-run' => true])
            ->expectsOutput('Found 1 inactive users.')
            ->expectsOutput('DRY RUN MODE - No changes will be made')
            ->assertExitCode(0);

        // Verify no users were actually deleted
        $this->assertDatabaseHas('users', ['id' => $inactiveUser->id]);
        $this->assertDatabaseHas('users', ['id' => $activeUser->id]);
    }

    public function test_it_deletes_inactive_users_with_force()
    {
        $inactiveUser = User::factory()->create([
            'last_login_at' => now()->subYears(2),
        ]);

        $this->artisan('users:cleanup', ['--force' => true])
            ->expectsOutput('Found 1 inactive users.')
            ->expectsOutput('Successfully deleted 1 users.')
            ->assertExitCode(0);

        $this->assertDatabaseMissing('users', ['id' => $inactiveUser->id]);
    }

    public function test_it_prompts_for_confirmation()
    {
        User::factory()->create([
            'last_login_at' => now()->subYears(2),
        ]);

        $this->artisan('users:cleanup')
            ->expectsConfirmation('Delete 1 users?', 'no')
            ->expectsOutput('Operation cancelled.')
            ->assertExitCode(0);
    }

    public function test_export_command_creates_csv_file()
    {
        User::factory()->count(5)->create();

        $this->artisan('users:export', ['format' => 'csv'])
            ->assertExitCode(0);

        $this->assertFileExists(storage_path('exports/users.csv'));
    }
}
```

## Summary

| Feature | Syntax / Method |
|---------|----------------|
| Generate command | `php artisan make:command Name` |
| Required argument | `{name}` |
| Optional argument | `{name?}` |
| Argument with default | `{name=default}` |
| Array argument | `{names*}` |
| Boolean option | `{--flag}` |
| Option with value | `{--option=}` |
| Option with default | `{--option=default}` |
| Option shortcut | `{-o\|--option}` |
| Array option | `{--option=*}` |
| Output methods | `info()`, `error()`, `warn()`, `line()`, `table()` |
| Progress bar | `withProgressBar()` or `createProgressBar()` |
| Interactive input | `ask()`, `secret()`, `confirm()`, `choice()` |
| Call other commands | `call()`, `callSilently()` |

Custom Artisan commands transform repetitive tasks into reliable, documented, and testable operations. They integrate with Laravel's scheduler, queue system, and testing utilities, making them a powerful tool for automation.

---

After building your custom commands, you need visibility into how they perform in production. Are your scheduled tasks running on time? Do long-running imports complete successfully? How do you know when a critical background job fails at 3 AM?

[OneUptime](https://oneuptime.com) provides complete observability for your Laravel applications and Artisan commands. Monitor scheduled task execution, track command performance metrics, receive instant alerts when commands fail, and review logs to debug issues quickly. Whether you are running data imports, cleanup jobs, or health checks, OneUptime ensures you know exactly what is happening in your system and when something needs attention.