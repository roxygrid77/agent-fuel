import argparse
import time
import requests
import sys
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich import print

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

console = Console()

API_BASE_URL = "http://localhost:3001/api"

def run_agent(agent_id, amount, fast=False):
    console.print(Panel.fit(f"[bold blue]🤖 Initializing Autonomous AI Agent[/bold blue]\nAgent ID: [green]{agent_id}[/green]", border_style="blue"))
    if not fast: time.sleep(1)
    
    console.print("[yellow]>[/yellow] Executing daily market analysis routine...")
    if not fast: time.sleep(1.5)
    console.print("[yellow]>[/yellow] Analyzing sentiment data from Twitter API...")
    if not fast: time.sleep(1.5)
    
    # Simulate hitting a paywall
    console.print("\n[bold red]⚠️  PAYWALL ENCOUNTERED[/bold red]")
    console.print("[red]Access to 'Premium Financial Data API' requires payment.[/red]")
    console.print(f"[white]Required amount: [bold green]${amount} USDC[/bold green][/white]\n")
    
    if not fast: time.sleep(2)
    console.print("[cyan]>[/cyan] Requesting funds from Agent Fuel Wallet Gateway...")
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        transient=True,
    ) as progress:
        progress.add_task("[cyan]Processing nanopayment via Circle Arc...", total=None)
        
        try:
            # Make the API call to our backend
            response = requests.post(f"{API_BASE_URL}/pay", json={
                "agentId": agent_id,
                "amount": amount,
                "description": "Premium Financial Data API Access"
            })
            
            if not fast: time.sleep(2) # Simulate network delay
            
            if response.status_code == 200:
                data = response.json()
                console.print(f"[bold green]✅ PAYMENT SUCCESSFUL[/bold green]")
                console.print(f"Transaction ID: [dim]{data['transactionId']}[/dim]")
                console.print(f"Remaining Balance: [bold green]${data['remainingBalance']:.2f} USDC[/bold green]\n")
                
                console.print("[yellow]>[/yellow] Paywall bypassed. Downloading premium data...")
                if not fast: time.sleep(1)
                console.print("[bold blue]🎯 Task Completed Successfully![/bold blue]")
            else:
                data = response.json()
                console.print(f"[bold red]❌ PAYMENT FAILED[/bold red]")
                console.print(f"Reason: {data.get('error', 'Unknown Error')}")
                console.print("[red]Agent shutting down due to lack of funds.[/red]")
                
        except requests.exceptions.ConnectionError:
            console.print("[bold red]❌ CONNECTION ERROR[/bold red]")
            console.print("Could not connect to the Agent Fuel Backend. Is the server running?")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Agent Fuel Mock AI Agent")
    parser.add_argument("--agent_id", type=str, required=True, help="The ID of the agent wallet")
    parser.add_argument("--amount", type=float, default=0.08, help="Amount to pay in USDC")
    parser.add_argument("--iterations", type=int, default=1, help="Number of times to run the agent routine")
    parser.add_argument("--fast", action="store_true", help="Skip the artificial delay timers")
    
    args = parser.parse_args()
    
    for i in range(args.iterations):
        if args.iterations > 1:
            console.print(f"\n[bold magenta]--- Iteration {i+1}/{args.iterations} ---[/bold magenta]")
        run_agent(args.agent_id, args.amount, args.fast)
        if i < args.iterations - 1 and not args.fast:
            time.sleep(2)
