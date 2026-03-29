import React from 'react';

export class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-black text-red-500 p-12 font-mono flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl md:text-6xl font-black mb-8 uppercase tracking-[0.2em] animate-pulse chromatic">SYSTEM_FAILURE_V4</h1>
          <div className="w-full max-w-2xl bg-white/5 border border-red-500/20 p-6 mb-8 text-left">
             <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-4">Error Context:</p>
             <p className="text-[12px] text-white font-mono mb-4">{this.state.error?.message || 'CRITICAL_UNHANDLED_EXCEPTION'}</p>
             <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-2">Stack Trace:</p>
             <pre className="text-[8px] text-zinc-600 font-mono overflow-auto max-h-40 no-scrollbar tracking-tighter leading-tight italic">
               {this.state.error?.stack}
             </pre>
          </div>
          <button 
            onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }}
            className="px-10 py-5 bg-red-600 text-black hover:bg-white transition-all text-[12px] uppercase font-black tracking-[0.4em] shadow-[0_0_50px_rgba(220,38,38,0.3)]"
          >
            Emergency Factory Reset
          </button>
          <p className="mt-8 text-[8px] text-zinc-800 uppercase tracking-widest">Warning: This will clear all local session data and keys.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
