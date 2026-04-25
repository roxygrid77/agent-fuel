import { useState, useEffect, useRef } from 'react';
import { Wallet, Plus, ArrowRightLeft, Cpu, Activity, UserPlus, AlertTriangle, Play, ToggleLeft, ToggleRight } from 'lucide-react';

function App() {
  const [state, setState] = useState({
    masterWalletBalance: 0,
    agents: [],
    globalTransactions: []
  });

  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentFund, setNewAgentFund] = useState('');
  const [newAgentLimit, setNewAgentLimit] = useState('');
  const [masterFundAmount, setMasterFundAmount] = useState('');

  const [toasts, setToasts] = useState([]);
  const lastTxIdRef = useRef(null);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      const data = await res.json();
      setState(data);
      
      if (data.globalTransactions && data.globalTransactions.length > 0) {
        const latestTx = data.globalTransactions[data.globalTransactions.length - 1];
        if (lastTxIdRef.current !== null && latestTx.id !== lastTxIdRef.current) {
          if (latestTx.type === 'AUTO_TOP_UP') addToast(`Auto Top-Up: +$${latestTx.amount} USDC for ${latestTx.agentId}`, 'success');
          else if (latestTx.type === 'API_PAYMENT') addToast(`Payment: -$${latestTx.amount} USDC by ${latestTx.agentId}`, 'info');
          else if (latestTx.type === 'MANUAL_FUNDING') addToast(`Manual Funding: +$${latestTx.amount} USDC`, 'success');
          else if (latestTx.type === 'MASTER_FUND') addToast(`Master Funded: +$${latestTx.amount} USDC`, 'success');
        }
        lastTxIdRef.current = latestTx.id;
      }
    } catch (err) {
      console.error('Failed to fetch state', err);
    }
  };

  // Poll state every 2 seconds
  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, []);

  const fundMasterWallet = async (e) => {
    e.preventDefault();
    if (!masterFundAmount) return;
    try {
      await fetch('/api/master/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: masterFundAmount })
      });
      setMasterFundAmount('');
      fetchState();
    } catch (err) {
      console.error(err);
    }
  };

  const createAgent = async (e) => {
    e.preventDefault();
    if (!newAgentName) return;
    try {
      await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAgentName,
          initialFunding: newAgentFund || 0,
          spendingLimit: newAgentLimit || 5
        })
      });
      setNewAgentName('');
      setNewAgentFund('');
      setNewAgentLimit('');
      fetchState();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleAutoTopUp = async (agentId) => {
    try {
      await fetch(`/api/wallets/${agentId}/autotopup`, { method: 'POST' });
      fetchState();
    } catch (err) {
      console.error(err);
    }
  };

  const runDemoAgent = async (agentId) => {
    try {
      await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });
      fetchState();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center justify-between pb-6 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Agent Fuel</h1>
          </div>
          <div className="flex items-center space-x-2 text-gray-400 bg-gray-800/50 px-4 py-2 rounded-full border border-gray-700">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium">Network: Arc (USDC)</span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column: Master Wallet & Create Agent */}
          <div className="space-y-6">
            
            {/* Master Wallet Card */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                <Wallet className="w-4 h-4 mr-2" />
                Master Wallet
              </h2>
              <div className="text-4xl font-bold mb-6 flex items-baseline">
                ${state.masterWalletBalance.toFixed(2)}
                <span className="text-sm text-gray-500 ml-2 font-normal">USDC</span>
              </div>
              
              <form onSubmit={fundMasterWallet} className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Amount"
                  value={masterFundAmount}
                  onChange={(e) => setMasterFundAmount(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  step="0.01"
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
                  Fund
                </button>
              </form>
            </div>

            {/* Create Agent Form */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                <UserPlus className="w-4 h-4 mr-2" />
                Create Agent Wallet
              </h2>
              <form onSubmit={createAgent} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Agent Name</label>
                  <input
                    type="text"
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Trading Bot"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Initial Fund (USDC)</label>
                    <input
                      type="number"
                      value={newAgentFund}
                      onChange={(e) => setNewAgentFund(e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-500"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Spend Limit</label>
                    <input
                      type="number"
                      value={newAgentLimit}
                      onChange={(e) => setNewAgentLimit(e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-500"
                      placeholder="5.00"
                      step="0.01"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center">
                  <Plus className="w-4 h-4 mr-1" /> Deploy Agent Wallet
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Agents List & Global Ledger */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Active Agents */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl overflow-x-auto">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Active Agents</h2>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="pb-3 font-medium">Agent</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Balance</th>
                    <th className="pb-3 font-medium">Limit</th>
                    <th className="pb-3 font-medium">Auto Top-Up</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {state.agents.map((agent) => (
                    <tr key={agent.id} className={`border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors ${agent.isLowBalance ? 'bg-red-500/5' : ''}`}>
                      <td className="py-3 font-medium flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${agent.status === 'Active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-500'}`}></div>
                        {agent.name}
                        <span className="ml-2 text-xs text-gray-600 font-mono">{agent.id.split('-')[1]}</span>
                      </td>
                      <td className="py-3 text-xs text-gray-400">
                        {agent.status}
                      </td>
                      <td className="py-3 font-mono flex flex-col items-start">
                        <div className={`animate-balance-update ${agent.isLowBalance ? 'text-red-400 font-bold' : 'text-blue-400'}`}>
                          ${agent.balance.toFixed(2)}
                        </div>
                        {agent.isLowBalance && (
                          <span className="text-[10px] text-red-500 flex items-center mt-1 bg-red-500/10 px-1.5 py-0.5 rounded animate-pulse-red">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Low fuel
                          </span>
                        )}
                      </td>
                      <td className="py-3 font-mono text-gray-400">${agent.spendingLimit.toFixed(2)}</td>
                      <td className="py-3">
                        <button onClick={() => toggleAutoTopUp(agent.id)} className="text-gray-400 hover:text-white transition-colors">
                          {agent.autoTopUp ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6" />}
                        </button>
                      </td>
                      <td className="py-3">
                        <button onClick={() => runDemoAgent(agent.id)} className="bg-gray-800 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs flex items-center transition-colors">
                          <Play className="w-3 h-3 mr-1" /> Demo
                        </button>
                      </td>
                    </tr>
                  ))}
                  {state.agents.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-gray-600">No agents deployed yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Global Ledger */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Live Transaction Ledger
              </h2>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {state.globalTransactions.slice().reverse().map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/40 border border-gray-800/60">
                    <div className="flex items-center space-x-3">
                      <div className={`p-1.5 rounded-md ${tx.type === 'API_PAYMENT' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                        <ArrowRightLeft className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-200">
                          {tx.type === 'MASTER_FUND' ? 'Master Wallet Deposit' : tx.type === 'MANUAL_FUNDING' ? 'Agent Funding' : tx.type === 'AUTO_TOP_UP' ? 'Auto Top-Up' : tx.description || 'API Payment'}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">{tx.agentId} • {new Date(tx.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </div>
                    <div className={`text-sm font-mono font-medium ${tx.type === 'API_PAYMENT' ? 'text-red-400' : 'text-green-400'}`}>
                      {tx.type === 'API_PAYMENT' ? '-' : '+'}${tx.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
                {state.globalTransactions.length === 0 && (
                  <div className="text-center text-gray-600 py-4">No transactions yet.</div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
      
      {/* Toast Notifications Overlay */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto px-4 py-3 rounded-lg shadow-2xl text-sm animate-slide-in flex items-center space-x-3 border ${
            t.type === 'error' ? 'bg-red-950 border-red-800 text-red-200' : 
            t.type === 'success' ? 'bg-green-950 border-green-800 text-green-200' : 
            'bg-gray-800 border-gray-700 text-gray-200'
          }`}>
            <Activity className="w-4 h-4" />
            <span className="font-medium">{t.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

export default App;
