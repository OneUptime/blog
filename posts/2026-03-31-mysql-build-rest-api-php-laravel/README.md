# How to Build a REST API with MySQL and PHP Laravel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Laravel, PHP, REST API, Eloquent

Description: Build a REST API with PHP Laravel and MySQL using Eloquent ORM, API resources for response transformation, and route model binding.

---

## Project Setup

Laravel provides a complete framework for building MySQL-backed REST APIs, including Eloquent ORM, route model binding, form requests for validation, and API resources for response formatting.

```bash
composer create-project laravel/laravel mysql-laravel-api
cd mysql-laravel-api
```

## MySQL Configuration

```text
# .env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=myapp
DB_USERNAME=app_user
DB_PASSWORD=app_password
```

## Order Migration

```php
<?php
// database/migrations/2026_03_31_000001_create_orders_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->decimal('total', 10, 2);
            $table->string('status', 20)->default('pending');
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
```

```bash
php artisan migrate
```

## Order Model

```php
<?php
// app/Models/Order.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Order extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'total', 'status'];

    protected $casts = [
        'total'      => 'decimal:2',
        'created_at' => 'datetime',
    ];

    const VALID_STATUSES = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];
}
```

## Form Request Validation

```php
<?php
// app/Http/Requests/CreateOrderRequest.php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateOrderRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'user_id' => 'required|integer|min:1',
            'total'   => 'required|numeric|min:0.01',
        ];
    }
}
```

## API Resource

```php
<?php
// app/Http/Resources/OrderResource.php
namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'         => $this->id,
            'user_id'    => $this->user_id,
            'total'      => $this->total,
            'status'     => $this->status,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
```

## API Controller

```php
<?php
// app/Http/Controllers/OrderController.php
namespace App\Http\Controllers;

use App\Http\Requests\CreateOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(): \Illuminate\Http\Resources\Json\AnonymousResourceCollection
    {
        return OrderResource::collection(
            Order::latest()->limit(50)->get()
        );
    }

    public function show(Order $order): OrderResource
    {
        return new OrderResource($order);
    }

    public function store(CreateOrderRequest $request): \Illuminate\Http\JsonResponse
    {
        $order = Order::create($request->validated() + ['status' => 'pending']);
        return (new OrderResource($order))->response()->setStatusCode(201);
    }

    public function updateStatus(Request $request, Order $order): OrderResource
    {
        $request->validate([
            'status' => 'required|in:' . implode(',', Order::VALID_STATUSES),
        ]);
        $order->update(['status' => $request->status]);
        return new OrderResource($order);
    }
}
```

## Routes

```php
<?php
// routes/api.php
use App\Http\Controllers\OrderController;

Route::get('/orders',               [OrderController::class, 'index']);
Route::post('/orders',              [OrderController::class, 'store']);
Route::get('/orders/{order}',       [OrderController::class, 'show']);
Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
```

## Summary

Laravel provides a complete toolkit for building MySQL REST APIs: Eloquent ORM handles parameterized queries and relationships, form requests centralize validation logic, API resources transform models into consistent JSON responses, and route model binding automatically fetches models by ID. The result is clean, maintainable API code with minimal boilerplate.
