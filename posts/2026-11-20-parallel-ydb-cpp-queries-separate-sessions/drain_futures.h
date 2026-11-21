#pragma once
#include <exception>
#include <vector>

template <class Future>
bool DrainAll(std::vector<Future>& pending,
              std::exception_ptr failure = nullptr) {
    bool allSuccessful = true;
    for (auto& future : pending) {
        try {
            if (!future.GetValueSync().IsSuccess()) allSuccessful = false;
        } catch (...) {
            if (!failure) failure = std::current_exception();
        }
    }
    if (failure) std::rethrow_exception(failure);
    return allSuccessful;
}
