import { createContext, useContext, useState, useEffect } from 'react';
import { sortTransactionsByDateDescending, groupTransactionsByMonthFromCurrent } from '../Services/TransactionsData';
import axios from 'axios';
import { useAuth } from './AuthContext';

// Create a context
const TransactionsContext = createContext(null);

// Actual logic that used to be in useTransactions()
function useTransactionsLogic() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth(); // Add this line

  useEffect(() => {
    async function fetchTransactions() {
      if (!user?.userId) return; // Add this check
      try {
        const response = await axios.get(`/api/complex/transactions/${user.userId}`);
        setTransactions(response.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, [user?.userId]); // Update dependency

  const sortedTransactions = sortTransactionsByDateDescending(transactions);
  const transactionsGrouped = groupTransactionsByMonthFromCurrent(sortedTransactions);

  const availableMonths = transactionsGrouped.map((g) => {
    const date = new Date(g.year, g.month, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  });

  async function handleSave(updatedTxn) {
    try {
      if (updatedTxn.transaction_id) {
        await axios.put(`/api/complex/transaction/${updatedTxn.transaction_id}`, updatedTxn);
        const response = await axios.get(`/api/complex/transactions/${user.userId}`);
        setTransactions(response.data);
      } else {
        const response = await axios.post(`/api/complex/transaction`, { ...updatedTxn, user_id: user.userId });
        const newTransaction = { ...updatedTxn, transaction_id: response.data.transaction_id };
        setTransactions(prev => [...prev, newTransaction]);
      }
    } catch (err) {
      setError(err);
    }
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/complex/transaction/${id}`);
      setTransactions((prev) => prev.filter((txn) => txn.transaction_id !== id));
    } catch (err) {
      setError(err);
    }
  };

  return {
    transactions,
    transactionsGrouped,
    availableMonths,
    handleSave,
    handleDelete,
    loading,
    error,
  };
}

// Provider that wraps children with the single instance of state
export function TransactionsProvider({ children }) {
  const value = useTransactionsLogic();
  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
}

// Hook to consume our context
export function useTransactions() {
  return useContext(TransactionsContext);
}