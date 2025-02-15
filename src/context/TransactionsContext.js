import { createContext, useContext, useState, useEffect } from 'react';
import { sortTransactionsByDateDescending, groupTransactionsByMonthFromCurrent } from '../Services/TransactionsData';
import axios from 'axios';
import { useAuth } from './AuthContext';

const TransactionsContext = createContext(null);

function useTransactionsLogic() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isAuthenticated } = useAuth();

  const getCurrentMonthYear = () => {
    const now = new Date();
    return now.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  useEffect(() => {
    async function fetchTransactions() {
      if (!user?.userId || !isAuthenticated) return;
      
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
  }, [user?.userId, isAuthenticated]);

  const sortedTransactions = sortTransactionsByDateDescending(transactions);
  const transactionsGrouped = groupTransactionsByMonthFromCurrent(sortedTransactions);

  // Update availableMonths logic
  const availableMonths = transactions.length === 0 
    ? [getCurrentMonthYear()]  // Return current month if no transactions
    : transactionsGrouped.map((g) => {
        const date = new Date(g.year, g.month, 1);
        return date.toLocaleString('default', { month: 'long', year: 'numeric' });
      });

  async function handleSave(updatedTxn) {
    try {
      if (updatedTxn.transaction_id) {
        // Edit existing - Add user_id to the request
        await axios.put(`/api/complex/transaction/${updatedTxn.transaction_id}`, {
          ...updatedTxn,
          user_id: user.userId
        });
      } else {
        // Add new (already has user_id)
        await axios.post(`/api/complex/transaction`, { 
          ...updatedTxn, 
          user_id: user.userId 
        });
      }
      // Refetch all transactions to get updated data with currency symbols
      const response = await axios.get(`/api/complex/transactions/${user.userId}`);
      setTransactions(response.data);
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

export function TransactionsProvider({ children }) {
  const value = useTransactionsLogic();
  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  return useContext(TransactionsContext);
}