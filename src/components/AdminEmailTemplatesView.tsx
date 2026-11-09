import React, { useState, useEffect } from 'react';
import { EmailNotificationTemplate, EmailTemplateEventId } from '../types/schema';
import { apiClient } from '../services/apiClient';
import { 
  Mail, 
  Send, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Edit3, 
  Code2, 
  Search, 
  Filter, 
  Sparkles, 
  Sliders, 
  Clock, 
  Copy,
  ChevronRight,
  ShieldCheck,
  Check
} from 'lucide-react';

interface AdminEmailTemplatesViewProps {
  adminEmail: string;
}

export const AdminEmailTemplatesView: React.FC<AdminEmailTemplatesViewProps> = ({ adminEmail }) => {
  const [templates, setTemplates] = useState<EmailNotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('account_creation');
  const [editingTemplate, setEditingTemplate] = useState<EmailNotificationTemplate | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'dispatches'>('editor');
  const [previewFormat, setPreviewFormat] = useState<'card' | 'raw'>('card');
  const [testEmail, setTestEmail] = useState(adminEmail);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [dispatches, setDispatches] = useState<any[]>([]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getEmailTemplates();
      setTemplates(data);
      if (data.length > 0 && !editingTemplate) {
        const initial = data.find((t) => t.id === selectedTemplateId) || data[0];
        setSelectedTemplateId(initial.id);
        setEditingTemplate({ ...initial });
      }
    } catch (err) {
      console.error('Failed to load email templates', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDispatches = async () => {
    try {
      const res = await fetch('/api/admin/email-dispatches');
      if (res.ok) {
        const logs = await res.json();
        setDispatches(logs);
      }
    } catch {}
  };

  useEffect(() => {
    fetchTemplates();
    fetchDispatches();
  }, []);

  const handleSelectTemplate = (tmpl: EmailNotificationTemplate) => {
    setSelectedTemplateId(tmpl.id);
    setEditingTemplate({ ...tmpl });
    setSaveSuccess(false);
    setTestResult(null);
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    try {
      const updated = await apiClient.updateEmailTemplate(editingTemplate.id, editingTemplate);
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTemplate({ ...updated });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save template', err);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all 12 protocol email templates to factory defaults? Any custom modifications will be restored.')) {
      return;
    }
    try {
      const res = await apiClient.resetEmailTemplates();
      setTemplates(res);
      const current = res.find((t) => t.id === selectedTemplateId) || res[0];
      setEditingTemplate({ ...current });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to reset templates', err);
    }
  };

  const handleSendTest = async () => {
    if (!editingTemplate || !testEmail) return;
    try {
      setIsSendingTest(true);
      setTestResult(null);
      const res = await apiClient.testEmailTemplate(editingTemplate.id, testEmail);
      setTestResult({
        success: true,
        message: `Dispatched test email to ${testEmail} with ID ${res.dispatchId || 'test_ok'}!`,
      });
      fetchDispatches();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to dispatch test email',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleCopyVar = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVar(variable);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const categories = ['all', ...Array.from(new Set(templates.map((t) => t.category)))];

  const filteredTemplates = templates.filter((t) => {
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    const matchesSearch = 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const sampleValues: Record<string, string> = {
    '{{user_name}}': 'Alex Mercer',
    '{{user_email}}': testEmail || 'alex.mercer@scofen.network',
    '{{role}}': 'Curator / Producer',
    '{{influence_points}}': '150',
    '{{assigned_points}}': '150',
    '{{point_delta}}': '+25',
    '{{authority_status}}': 'Verified Board Host Authority (≥100 PTS)',
    '{{industry_role}}': 'Audio Engineer / Record Producer',
    '{{host_name}}': 'Kaelen Vance',
    '{{host_email}}': 'kaelen.vance@scofen.network',
    '{{artist_name}}': 'Solana Grey',
    '{{artist_email}}': 'solana.grey@scofen.network',
    '{{board_title}}': 'Apex Metro: Cyber-Club Sonic Gauntlet',
    '{{genre}}': 'Cyberpunk & Club Synthwave',
    '{{entry_fee}}': '45.00',
    '{{track_title}}': 'Neon Horizon (Hyper-Drive Mix)',
    '{{entry_mode}}': 'Crowd Pool ($5.00)',
    '{{rater_name}}': 'Marcus Thorne',
    '{{score}}': '87.1',
    '{{crowd_average}}': '84.5',
    '{{curator_score}}': '88.0',
    '{{crowd_score}}': '84.5',
    '{{final_combined_score}}': '86.2',
    '{{total_ratings}}': '12',
    '{{new_total}}': '151',
    '{{reason}}': 'Consensus accuracy within 10% bounds (+1 PT)',
    '{{royalty_split}}': '70% Artist / 10% Curator / 10% Crowd / 10% Scofen',
    '{{amount}}': '5.00',
    '{{payment_type}}': 'Crowd Pool Entry Fee',
    '{{host_cut}}': '3.50',
    '{{platform_cut}}': '1.50',
    '{{ledger_id}}': 'LED_884291',
    '{{follower_name}}': 'Devin Cross',
    '{{follower_role}}': 'PRODUCER',
    '{{follower_influence}}': '120',
    '{{followed_name}}': 'Solana Grey',
    '{{login_url}}': 'https://scofen.com/login',
    '{{reset_link}}': 'https://scofen.network/auth/reset?token=sample-key',
    '{{expiry_time}}': '60 minutes',
    '{{support_email}}': 'security@scofen.network',
    '{{submitted_at}}': new Date().toLocaleString(),
    '{{current_points}}': '1',
    '{{admin_terminal_url}}': 'https://scofen.com/admin',
    '{{dashboard_url}}': 'https://scofen.com/dashboard',
    '{{board_url}}': 'https://scofen.com/boards/apex-metro',
    '{{track_url}}': 'https://scofen.com/tracks/neon-horizon',
    '{{stream_url}}': 'https://scofen.com/streaming/neon-horizon',
    '{{follower_profile_url}}': 'https://scofen.com/users/devin-cross',
    '{{platform_name}}': 'Scofen Protocol',
    '{{criteria_summary}}': 'Dynamic Tension (30%), Sub-Bass Monofiltration (35%), Synth Character (35%)',
    '{{timestamp}}': new Date().toLocaleString(),
    '{{payee_name}}': 'Kaelen Vance',
    '{{payer_name}}': 'Solana Grey',
    '{{payer_email}}': 'solana.grey@scofen.network',
  };

  const renderPreview = (): { subject: string; body: string } => {
    if (!editingTemplate) return { subject: '', body: '' };
    let renderedSubject = editingTemplate.subject;
    let renderedBody = editingTemplate.body;

    Object.entries(sampleValues).forEach(([k, v]) => {
      renderedSubject = renderedSubject.split(k).join(v);
      renderedBody = renderedBody.split(k).join(v);
    });

    renderedBody = renderedBody.replace(/\{\{#if_can_host\}\}/g, '').replace(/\{\{\/if_can_host\}\}/g, '');

    return { subject: renderedSubject, body: renderedBody };
  };

  const previewData = renderPreview();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / System Summary */}
      <div className="rounded-3xl bg-zinc-900/70 border border-zinc-800 p-6 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                  PROTOCOL DISPATCH TERMINAL
                </span>
                <span className="text-xs text-zinc-400 font-mono">12 Canonical Events Configured</span>
              </div>
              <h1 className="text-xl font-black text-white tracking-tight mt-0.5">
                Email Notification Templates & Event Triggers
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Configure, calibrate variables, and audit automated dispatches across all 12 decentralized protocol milestones.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleResetDefaults}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
              <span>Reset Defaults</span>
            </button>
            <button
              onClick={() => setActiveTab('dispatches')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                activeTab === 'dispatches'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Audit Log ({dispatches.length})</span>
            </button>
          </div>
        </div>

        {/* Global Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-zinc-800/80">
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
            <div className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Total Event Templates</div>
            <div className="text-lg font-black text-white font-mono mt-0.5">{templates.length} Events</div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
            <div className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Active / Enabled</div>
            <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
              {templates.filter((t) => t.enabled).length} / {templates.length}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
            <div className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Total Dispatches Logged</div>
            <div className="text-lg font-black text-teal-400 font-mono mt-0.5">{dispatches.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
            <div className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Sender Identity</div>
            <div className="text-xs font-semibold text-zinc-300 font-mono truncate mt-1">onboarding@resend.dev</div>
          </div>
        </div>
      </div>

      {activeTab === 'dispatches' ? (
        /* Dispatches Audit Log */
        <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Recent Event Dispatches (Audit Trail)</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Real-time operational ledger of automated and test email transmissions.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('editor')}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white"
            >
              Back to Template Editor
            </button>
          </div>

          {dispatches.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500 bg-zinc-950/50 rounded-2xl border border-zinc-800">
              No dispatches recorded yet in this session. Trigger an assessment, rating, or run a test dispatch.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60 rounded-2xl bg-zinc-950/70 border border-zinc-800 overflow-hidden">
              {dispatches.map((disp, i) => (
                <div key={disp.id || i} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs hover:bg-zinc-900/40">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        {disp.templateId}
                      </span>
                      <span className="font-semibold text-white">{disp.subject}</span>
                    </div>
                    <div className="font-mono text-zinc-400 text-[11px]">
                      Recipient: <span className="text-zinc-200">{disp.recipientEmail}</span>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-500 whitespace-nowrap">
                    {new Date(disp.timestamp).toLocaleTimeString()} • {new Date(disp.timestamp).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Template Management & Editing Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Template Selector List (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            {/* Search & Filter */}
            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search 12 event templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar pb-1 text-[11px]">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-emerald-500 text-zinc-950 font-bold'
                        : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    {cat === 'all' ? 'All (12)' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Items */}
            <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
              {filteredTemplates.map((tmpl, idx) => {
                const isSelected = tmpl.id === selectedTemplateId;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-900/90 border-emerald-500/60 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30'
                        : 'bg-zinc-950/80 border-zinc-800/80 hover:bg-zinc-900/60 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] uppercase font-bold text-zinc-500">
                        Event #{idx + 1} • {tmpl.category}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            tmpl.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                          }`}
                        />
                        <span className="text-[10px] font-mono text-zinc-400">
                          {tmpl.enabled ? 'Active' : 'Muted'}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs font-bold text-white tracking-tight flex items-center justify-between">
                      <span>{tmpl.name}</span>
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform ${
                          isSelected ? 'text-emerald-400 translate-x-0.5' : 'text-zinc-600'
                        }`}
                      />
                    </div>

                    <div className="text-[11px] text-zinc-400 truncate mt-1">
                      Subject: <span className="text-zinc-300">{tmpl.subject}</span>
                    </div>

                    <div className="text-[10px] text-zinc-500 font-mono mt-2 line-clamp-1">
                      {tmpl.triggerDescription}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Template Editor / Preview (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {editingTemplate && (
              <div className="rounded-3xl bg-zinc-900/80 border border-zinc-800 p-6 space-y-5">
                {/* Header of Active Template */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        {editingTemplate.category}
                      </span>
                      <span className="text-xs font-mono text-zinc-500">{editingTemplate.id}</span>
                    </div>
                    <h2 className="text-lg font-black text-white mt-1">{editingTemplate.name}</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">{editingTemplate.triggerDescription}</p>
                  </div>

                  <div className="flex items-center space-x-2 self-start sm:self-center">
                    {/* Enable Toggle */}
                    <button
                      type="button"
                      onClick={() =>
                        setEditingTemplate((prev) =>
                          prev ? { ...prev, enabled: !prev.enabled } : null
                        )
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        editingTemplate.enabled
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                      }`}
                    >
                      {editingTemplate.enabled ? 'Enabled' : 'Disabled'}
                    </button>

                    {/* Editor / Preview switch */}
                    <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                      <button
                        onClick={() => setActiveTab('editor')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 cursor-pointer ${
                          activeTab === 'editor'
                            ? 'bg-zinc-800 text-white font-bold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('preview')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 cursor-pointer ${
                          activeTab === 'preview'
                            ? 'bg-zinc-800 text-white font-bold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <Eye className="w-3 h-3" />
                        <span>Preview</span>
                      </button>
                    </div>
                  </div>
                </div>

                {activeTab === 'editor' ? (
                  <div className="space-y-4">
                    {/* Subject Line */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono uppercase text-zinc-400 font-bold">
                        Subject Line
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.subject}
                        onChange={(e) =>
                          setEditingTemplate((prev) =>
                            prev ? { ...prev, subject: e.target.value } : null
                          )
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    {/* Preheader Line */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono uppercase text-zinc-400 font-bold">
                        Inbox Preheader / Preview Snippet
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.preheader}
                        onChange={(e) =>
                          setEditingTemplate((prev) =>
                            prev ? { ...prev, preheader: e.target.value } : null
                          )
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    {/* Recipient Description */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono uppercase text-zinc-400 font-bold">
                        Recipient Routing Target
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.recipientDescription}
                        onChange={(e) =>
                          setEditingTemplate((prev) =>
                            prev ? { ...prev, recipientDescription: e.target.value } : null
                          )
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-400 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    {/* Available Variable Chips */}
                    <div className="space-y-1.5 p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold flex items-center space-x-1">
                          <Code2 className="w-3 h-3 text-emerald-400" />
                          <span>Insertable Interpolation Tags (Click to Copy)</span>
                        </span>
                        {copiedVar && (
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">
                            Copied {copiedVar}!
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {editingTemplate.variables.map((variable) => (
                          <button
                            type="button"
                            key={variable}
                            onClick={() => handleCopyVar(variable)}
                            className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 transition-colors flex items-center space-x-1 cursor-pointer"
                          >
                            <span>{variable}</span>
                            <Copy className="w-2.5 h-2.5 text-zinc-500" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Template Body */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-mono uppercase text-zinc-400 font-bold">
                          Email Plaintext / Dispatch Body
                        </label>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {editingTemplate.body.length} characters
                        </span>
                      </div>
                      <textarea
                        rows={11}
                        value={editingTemplate.body}
                        onChange={(e) =>
                          setEditingTemplate((prev) =>
                            prev ? { ...prev, body: e.target.value } : null
                          )
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
                      />
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-[11px] font-mono text-zinc-500">
                        Last modified: {new Date(editingTemplate.updated_at).toLocaleString()}
                      </div>
                      <div className="flex items-center space-x-2">
                        {saveSuccess && (
                          <span className="text-xs font-mono text-emerald-400 flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Saved to Protocol!</span>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={handleSaveTemplate}
                          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Template</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Live Rendered Preview */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-zinc-400 uppercase font-semibold">
                        Preview Format
                      </span>
                      <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setPreviewFormat('card')}
                          className={`px-3 py-1 rounded-lg font-medium transition-all ${
                            previewFormat === 'card'
                              ? 'bg-purple-950/60 text-purple-300 border border-purple-500/40 font-bold'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          Visual Scofen Card
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewFormat('raw')}
                          className={`px-3 py-1 rounded-lg font-medium transition-all ${
                            previewFormat === 'raw'
                              ? 'bg-zinc-850 text-white font-bold'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          Plain-Text MIME
                        </button>
                      </div>
                    </div>

                    {previewFormat === 'card' ? (
                      /* Scofen Branded Visual Email Card */
                      <div className="bg-[#F3F4F6] p-6 rounded-2xl border border-zinc-700 shadow-inner">
                        <div className="max-w-[560px] mx-auto bg-white rounded-md border border-[#E5E7EB] overflow-hidden text-left shadow-md">
                          {/* Brand Header */}
                          <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-white">
                            <div className="flex items-center space-x-1.5 font-mono text-sm font-extrabold uppercase text-[#111827] tracking-wider">
                              <span>SCOFEN</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-[#6B21A8]" />
                            </div>
                            <span className="text-[10px] font-mono uppercase text-[#6B7280] tracking-wide">
                              Protocol Infrastructure
                            </span>
                          </div>

                          {/* Heading Area */}
                          <div className="px-6 pt-5 pb-2">
                            <h3 className="text-base font-bold text-[#111827] leading-snug">
                              {previewData.subject}
                            </h3>
                            {editingTemplate.preheader && (
                              <p className="text-xs text-[#6B7280] mt-1 italic">
                                {editingTemplate.preheader}
                              </p>
                            )}
                          </div>

                          {/* Body Content */}
                          <div className="px-6 py-4 text-xs text-[#374151] leading-relaxed whitespace-pre-wrap font-sans">
                            {previewData.body}
                          </div>

                          {/* Formal Ledger Footer */}
                          <div className="px-6 py-4 bg-[#F9FAFB] border-t border-[#E5E7EB] text-[10px] text-[#6B7280] font-sans">
                            <div className="font-semibold text-[#374151] font-mono uppercase tracking-wide">
                              SCOFEN Music Platform
                            </div>
                            <div className="mt-0.5">
                              Decentralized multi-criteria evaluation infrastructure and trust ledger.
                            </div>
                            <div className="mt-1 text-[#9CA3AF]">
                              All entries, evaluations, and payouts are immutable ledger events.
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Raw Plain Text View */
                      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                        <div className="border-b border-zinc-800 pb-2.5 space-y-1 text-xs">
                          <div className="text-zinc-400 font-mono flex items-center justify-between">
                            <span>To: <strong className="text-white">{testEmail}</strong></span>
                            <span className="text-[10px] text-zinc-500">MIME Plain-Text Payload</span>
                          </div>
                          <div className="text-zinc-400 font-mono">
                            Subject: <strong className="text-emerald-400">{previewData.subject}</strong>
                          </div>
                          <div className="text-zinc-500 font-mono text-[11px]">
                            Preheader: {editingTemplate.preheader}
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 font-mono text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
                          {previewData.body}
                        </div>
                      </div>
                    )}

                    <div className="text-[11px] text-zinc-500 font-mono">
                      * Preview demonstrates dynamic tag substitution based on live schema context.
                    </div>
                  </div>
                )}

                {/* Test Dispatch Transmission Box */}
                <div className="pt-4 border-t border-zinc-800/80">
                  <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <Send className="w-3.5 h-3.5 text-teal-400" />
                        <span>Send Test Dispatch</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">
                        Validates template parsing and delivery
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="recipient@example.com"
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                      />
                      <button
                        type="button"
                        disabled={isSendingTest || !testEmail}
                        onClick={handleSendTest}
                        className="px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold text-xs transition-colors disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>{isSendingTest ? 'Sending...' : 'Test Send'}</span>
                      </button>
                    </div>

                    {testResult && (
                      <div
                        className={`p-3 rounded-xl text-xs font-mono flex items-center space-x-2 ${
                          testResult.success
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {testResult.success ? (
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span>{testResult.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
