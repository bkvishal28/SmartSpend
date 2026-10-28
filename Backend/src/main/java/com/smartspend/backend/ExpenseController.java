
package com.smartspend.backend;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
@CrossOrigin(origins = "http://localhost:5173")
public class ExpenseController {

    private final ExpenseRepository expenseRepository;

    public ExpenseController(ExpenseRepository expenseRepository) {
        this.expenseRepository = expenseRepository;
    }

    // Get all expenses
    @GetMapping
    public List<Expense> getAllExpenses() {
        return expenseRepository.findAll();
    }

    // Add a new expense
    @PostMapping
    public Expense addExpense(@RequestBody Expense expense) {
        return expenseRepository.save(expense);
    }

    // Update an existing expense
    @PutMapping("/{id}")
    public Expense updateExpense(
            @PathVariable Long id,
            @RequestBody Expense updatedExpense) {

        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Expense not found"));

        expense.setTitle(updatedExpense.getTitle());
        expense.setAmount(updatedExpense.getAmount());
        expense.setCategory(updatedExpense.getCategory());
        expense.setDate(updatedExpense.getDate());

        return expenseRepository.save(expense);
    }

    // Delete an expense
    @DeleteMapping("/{id}")
    public void deleteExpense(@PathVariable Long id) {
        expenseRepository.deleteById(id);
    }
}
