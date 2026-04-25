const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const circleService = require('./services/circle');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// --- IN-MEMORY MOCK DATABASE ---
// In a real hackathon MVP, you could also use a simple JSON file or SQLite.
// For the fastest demo setup, we use memory.
let masterWalletBalance = 100.0; // Starting with 100 USDC

let agents = [
    {
        id: 'agent-1',
        name: 'OpenAI GPT-4 Agent',
        balance: 5.0, // Pre-funded with 5 USDC
        spendingLimit: 10.0,
        transactions: [],
        autoTopUp: false,
        lastActivityTimestamp: new Date().toISOString()
    }
];

let globalTransactions = [
    {
        id: uuidv4(),
        agentId: 'agent-1',
        amount: 5.0,
        type: 'MANUAL_FUNDING',
        timestamp: new Date().toISOString()
    }
];

// --- ROUTES ---

// Auto Top-Up Logic Helper
const processAutoTopUp = (agent) => {
    if (!agent.autoTopUp) return;
    const threshold = agent.spendingLimit * 0.2;
    if (agent.balance < threshold) {
        const topUpAmount = 1.0;
        if (masterWalletBalance >= topUpAmount) {
            masterWalletBalance -= topUpAmount;
            agent.balance += topUpAmount;
            agent.lastActivityTimestamp = new Date().toISOString();
            
            const tx = {
                id: uuidv4(),
                agentId: agent.id,
                amount: topUpAmount,
                type: 'AUTO_TOP_UP',
                timestamp: new Date().toISOString()
            };
            agent.transactions.push(tx);
            globalTransactions.push(tx);
            console.log(`[Auto Top-Up] ⚡ Funded ${agent.name} with ${topUpAmount} USDC`);
        }
    }
};

// 1. Get Overall Dashboard State
app.get('/api/state', (req, res) => {
    // Process top ups and compute dynamic properties
    const enrichedAgents = agents.map(agent => {
        processAutoTopUp(agent);
        
        const isLowBalance = agent.balance < (agent.spendingLimit * 0.2);
        
        const now = new Date();
        const lastActivity = new Date(agent.lastActivityTimestamp);
        const diffSeconds = (now - lastActivity) / 1000;
        const status = diffSeconds < 30 ? 'Active' : 'Idle';

        return { ...agent, isLowBalance, status };
    });

    res.json({
        masterWalletBalance,
        agents: enrichedAgents,
        globalTransactions
    });
});

// 2. Fund Master Wallet (Mock Circle API Deposit)
app.post('/api/master/fund', (req, res) => {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }
    
    masterWalletBalance += parseFloat(amount);
    
    globalTransactions.push({
        id: uuidv4(),
        agentId: 'MASTER',
        amount: parseFloat(amount),
        type: 'MASTER_FUND',
        timestamp: new Date().toISOString()
    });

    res.json({ success: true, newBalance: masterWalletBalance });
});

// 3. Create a new Agent Wallet
app.post('/api/wallets', async (req, res) => {
    const { name, initialFunding, spendingLimit } = req.body;
    
    if (!name) return res.status(400).json({ error: 'Agent name is required' });
    if (initialFunding > masterWalletBalance) {
        return res.status(400).json({ error: 'Insufficient funds in master wallet' });
    }

    const newAgentId = `agent-${uuidv4().split('-')[0]}`;
    await circleService.createWallet(name);
    
    const newAgent = {
        id: newAgentId,
        name,
        balance: parseFloat(initialFunding || 0),
        spendingLimit: parseFloat(spendingLimit || 5.0),
        transactions: [],
        autoTopUp: false,
        lastActivityTimestamp: new Date().toISOString()
    };

    if (newAgent.balance > 0) {
        masterWalletBalance -= newAgent.balance;
        
        const fundTx = {
            id: uuidv4(),
            agentId: newAgentId,
            amount: newAgent.balance,
            type: 'MANUAL_FUNDING',
            timestamp: new Date().toISOString()
        };
        newAgent.transactions.push(fundTx);
        globalTransactions.push(fundTx);
    }

    agents.push(newAgent);
    res.json({ success: true, agent: newAgent });
});

// 4. Agent Nanopayment Execution (Mock Circle API Transfer)
// The Agent hits this endpoint when it needs to pay for an API call
app.post('/api/pay', async (req, res) => {
    const { agentId, amount, description } = req.body;

    const agent = agents.find(a => a.id === agentId);
    
    if (!agent) {
        return res.status(404).json({ error: 'Agent wallet not found' });
    }

    const requestedAmount = parseFloat(amount);

    if (agent.balance < requestedAmount) {
        return res.status(402).json({ error: 'Payment Required: Insufficient agent balance' });
    }

    await circleService.sendPayment(agent.id, 'merchant-wallet', requestedAmount);

    // Process the payment
    agent.balance -= requestedAmount;
    agent.lastActivityTimestamp = new Date().toISOString();
    
    const tx = {
        id: uuidv4(),
        agentId: agent.id,
        amount: requestedAmount,
        type: 'API_PAYMENT',
        description: description || 'API Call',
        timestamp: new Date().toISOString()
    };
    
    agent.transactions.push(tx);
    globalTransactions.push(tx);

    processAutoTopUp(agent);

    res.json({ 
        success: true, 
        message: `Successfully paid ${requestedAmount} USDC for ${description || 'service'}`,
        remainingBalance: agent.balance,
        transactionId: tx.id
    });
});

// 5. Toggle Auto Top-Up
app.post('/api/wallets/:id/autotopup', (req, res) => {
    const agent = agents.find(a => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    
    agent.autoTopUp = !agent.autoTopUp;
    res.json({ success: true, autoTopUp: agent.autoTopUp });
});

// 6. Demo Mode: Trigger simulated payment
app.post('/api/demo', async (req, res) => {
    const { agentId } = req.body;
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    
    // Simulate a random payment between 0.1 and 1.0 USDC
    const amount = (Math.random() * 0.9 + 0.1).toFixed(2);
    
    if (agent.balance < parseFloat(amount)) {
        return res.status(402).json({ error: 'Payment Required: Insufficient agent balance' });
    }

    await circleService.sendPayment(agent.id, 'demo-merchant', amount);

    agent.balance -= parseFloat(amount);
    agent.lastActivityTimestamp = new Date().toISOString();
    
    const tx = {
        id: uuidv4(),
        agentId: agent.id,
        amount: parseFloat(amount),
        type: 'API_PAYMENT',
        description: 'Demo Payment',
        timestamp: new Date().toISOString()
    };
    
    agent.transactions.push(tx);
    globalTransactions.push(tx);

    processAutoTopUp(agent);

    res.json({ success: true, message: 'Demo payment executed', amount });
});

app.listen(PORT, () => {
    console.log(`🚀 Agent Fuel Backend running on http://localhost:${PORT}`);
});
