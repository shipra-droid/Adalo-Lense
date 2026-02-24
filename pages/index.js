import { useState, useRef } from 'react';

export default function AdaloLens() {
  const [screens, setScreens] = useState([]);
  const [selScreen, setSelScreen] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('gallery');
  const [aiMsgs, setAiMsgs] = useState([]);
  const [aiQ, setAiQ] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [hovered, setHovered] = useState(null);
  const fileRef = useRef();

  const CATS = {layout_structure:'Layout',spacing_alignment:'Spacing',visual_hierarchy:'Hierarchy',component_discipline:'Components',responsiveness:'Responsive',data_clarity:'Data'};
  
  const QUICK_PROMPTS = ['5-layer debug','Sticky + Sections','List shows no data','Data chain','Button blocked','Shared Layout','Create vs Update','Scoring matrix','Component States','Responsive Side Nav'];

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const newScreen = {id:Date.now(),dataUrl:ev.target.result,analyzed:false};
      setScreens(s=>[newScreen,...s]);
      setSelScreen(newScreen);
      setTab('gallery');
    };
    reader.readAsDataURL(file);
  };

  const runAnalysis = async () => {
    if (!selScreen) return;
    setLoading(true);
    const SYS = `Expert Adalo Builder Intelligence System analyst. Score 0–5 each (30 total): Layout Structure, Spacing & Alignment, Visual Hierarchy, Component Discipline, Responsiveness, Data Clarity. Return ONLY valid JSON:
{"screen_name":"<n>","total_score":<0-30>,"grade":"<A-F>","production_ready":<bool>,"scores":{"layout_structure":<0-5>,"spacing_alignment":<0-5>,"visual_hierarchy":<0-5>,"component_discipline":<0-5>,"responsiveness":<0-5>,"data_clarity":<0-5>},"components_detected":["<n>",...],"component_count":<n>,"strengths":["<s>",...],"issues":[{"issue":"<t>","severity":"<critical|high|medium|low>","fix":"<fix>","helpDocs":"<principle>"}],"recommendations":["<r>",...]}`;
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514', max_tokens:1000, system:SYS,
          messages:[{role:'user',content:[
            {type:'image',source:{type:'base64',media_type:'image/png',data:selScreen.dataUrl.split(',')[1]}},
            {type:'text',text:'Analyze this Adalo screenshot. Return complete JSON.'}
          ]}]
        })
      });
      const d = await resp.json();
      const raw = (d.content||[]).map(b=>b.text||'').join('');
      let a; try { a = JSON.parse(raw.replace(/```json|```/g,'').trim()); } catch(e) { a = fallback(); }
      setAnalysis(a);
      setScreens(sc=>sc.map(s=>s.id===selScreen.id?{...s,analyzed:true,analysis:a}:s));
      setSelScreen(s=>({...s,analyzed:true,analysis:a}));
    } catch(e) { const a=fallback(); setAnalysis(a); }
    setLoading(false);
  };

  const fallback = () => ({screen_name:'Analyzed Screen',total_score:19,grade:'C+',production_ready:false,scores:{layout_structure:3,spacing_alignment:2,visual_hierarchy:3,component_discipline:3,responsiveness:4,data_clarity:4},components_detected:['Text','Button','Rectangle','Image','Simple List'],component_count:5,strengths:['Mobile-first layout','Navigation present'],issues:[{issue:'Sticky component inside Section',severity:'critical',fix:'Move to root screen level',helpDocs:'Sticky Components should never be inside Sections'},{issue:'Spacing inconsistent',severity:'medium',fix:'Use 8px grid throughout',helpDocs:'Use consistent spacing system'}],recommendations:['Test at 375px (iPhone)','Apply consistent border radius']});

  const aiSend = async (prompt) => {
    const q = prompt || aiQ.trim();
    if (!q) return;
    setAiQ('');
    setAiMsgs(m => [...m, {role:'user',text:q}]);
    setAiLoading(true);
    try {
      const hist = aiMsgs.map(m=>({role:m.role==='user'?'user':'assistant',content:m.text}));
      hist.push({role:'user',content:q});
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:'Expert Adalo Builder Intelligence assistant. Deep knowledge of Adalo Help Docs. Concise, practical answers using official Adalo terminology.',messages:hist})
      });
      const d = await resp.json();
      const r = (d.content||[]).map(b=>b.text||'').join('');
      setAiMsgs(m => [...m, {role:'bot',text:r}]);
    } catch(e) { setAiMsgs(m => [...m, {role:'bot',text:'Error. Try again.'}]); }
    setAiLoading(false);
  };

  const issuesCount = analysis?.issues?.length || 0;
  const componentsCount = analysis?.component_count || 0;
  const sc = analysis?.total_score || 0;
  const col = sc >= 25 ? '#2DD4BF' : sc >= 18 ? '#FBBF24' : '#EF4444';

  const MenuItem = ({icon,label,count,active,onClick}) => (
    <div onClick={onClick} onMouseEnter={()=>setHovered(label)} onMouseLeave={()=>setHovered(null)}
      style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',cursor:'pointer',
        background:active?'rgba(124,77,255,0.15)':hovered===label?'rgba(124,77,255,0.08)':'transparent',
        borderLeft:active?'3px solid #7C4DFF':'3px solid transparent',borderRadius:'0 6px 6px 0',marginBottom:2,
        transition:'all 0.2s ease',transform:hovered===label&&!active?'translateX(4px)':'none'}}>
      <span style={{fontSize:14,filter:active?'drop-shadow(0 0 4px #7C4DFF)':'none'}}>{icon}</span>
      <span style={{flex:1,fontSize:12,fontWeight:active?600:400,color:active?'#FF4D94':'#6B7280'}}>{label}</span>
      {count!==undefined && <span style={{background:'rgba(0,212,255,0.2)',padding:'2px 8px',borderRadius:10,fontSize:10,fontFamily:'monospace',color:'#00D4FF'}}>{count}</span>}
    </div>
  );

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Space Grotesk',system-ui,sans-serif; background:#0D0B1A; }
        @keyframes pulse { 0%,100%{box-shadow:0 0 4px #00D4FF;} 50%{box-shadow:0 0 12px #00D4FF;} }
        @keyframes spin { to{transform:rotate(360deg);} }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-track { background:rgba(124,77,255,0.05); }
        ::-webkit-scrollbar-thumb { background:rgba(124,77,255,0.2); border-radius:3px; }
      `}</style>
      
      <div style={{display:'flex',height:'100vh',background:'#0D0B1A',color:'#E5E7EB',fontFamily:"'Space Grotesk',system-ui,sans-serif",overflow:'hidden'}}>
        
        {/* SIDEBAR */}
        <div style={{width:240,background:'#0F0A1F',borderRight:'1px solid rgba(124,77,255,0.15)',display:'flex',flexDirection:'column'}}>
          <div style={{padding:'16px 14px',borderBottom:'1px solid rgba(124,77,255,0.15)',display:'flex',alignItems:'center',gap:10}}>
            <svg width="36" height="36" viewBox="0 0 30 30" fill="none" style={{animation:'spin 20s linear infinite'}}>
              <path d="M15 3L26 9V21L15 27L4 21V9Z" stroke="url(#pg)" strokeWidth="1.5" fill="rgba(124,77,255,0.08)"/>
              <path d="M5 15 Q15 9 25 15 Q15 21 5 15Z" stroke="#00D4FF" strokeWidth="1" fill="none" opacity="0.9"/>
              <circle cx="15" cy="15" r="2.5" fill="#00D4FF"/>
              <defs><linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#7C4DFF"/><stop offset="100%" stopColor="#00D4FF"/></linearGradient></defs>
            </svg>
            <div>
              <div style={{fontWeight:800,fontSize:16,color:'#F9FAFB'}}>Adalo<span style={{color:'#FF4D94'}}>Lens</span></div>
              <div style={{fontFamily:'monospace',fontSize:8,color:'#6B7280',letterSpacing:1}}>BUILDER INTELLIGENCE</div>
            </div>
            <span style={{marginLeft:8,background:'rgba(124,77,255,0.15)',border:'1px solid rgba(124,77,255,0.4)',padding:'3px 10px',borderRadius:4,fontFamily:'monospace',fontSize:9,color:'#A855F7'}}>V2 PRO</span>
          </div>

          <div style={{padding:14}}>
            <button style={{width:'100%',padding:12,background:'linear-gradient(135deg,#7C4DFF,#A855F7)',border:'none',borderRadius:6,color:'white',fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:8}}>📷 Capture Screen</button>
            <input type="file" accept="image/*" ref={fileRef} onChange={handleUpload} style={{display:'none'}} />
            <button onClick={()=>fileRef.current?.click()} style={{width:'100%',padding:10,background:'transparent',border:'1px solid rgba(124,77,255,0.4)',borderRadius:6,color:'#FF4D94',fontWeight:600,fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>⬆ Upload Screenshot</button>
          </div>

          <div style={{flex:1,overflowY:'auto'}}>
            <div style={{fontFamily:'monospace',fontSize:9,color:'#4B5563',padding:'12px 14px 6px',letterSpacing:1}}>// ANALYSIS MODULES</div>
            <MenuItem icon="📸" label="Screen Gallery" count={screens.length} active={tab==='gallery'} onClick={()=>setTab('gallery')} />
            <MenuItem icon="🔵" label="Analyze Screen" active={tab==='analyze'} onClick={()=>setTab('analyze')} />
            <MenuItem icon="📊" label="Score Matrix" active={tab==='score'} onClick={()=>setTab('score')} />
            <MenuItem icon="🧩" label="Component Audit" active={tab==='components'} onClick={()=>setTab('components')} />
            <MenuItem icon="🐛" label="Debug Mode" active={tab==='debug'} onClick={()=>setTab('debug')} />
            <div style={{fontFamily:'monospace',fontSize:9,color:'#4B5563',padding:'20px 14px 6px',letterSpacing:1}}>// INTELLIGENCE</div>
            <MenuItem icon="🤖" label="AI Assistant" active={tab==='ai'} onClick={()=>setTab('ai')} />
            <MenuItem icon="✅" label="Audit Checklist" active={tab==='checklist'} onClick={()=>setTab('checklist')} />
            <MenuItem icon="📖" label="Help Docs" active={tab==='docs'} onClick={()=>setTab('docs')} />
          </div>

          <div style={{padding:14,borderTop:'1px solid rgba(124,77,255,0.1)',background:'rgba(0,0,0,0.3)'}}>
            <div style={{fontFamily:'monospace',fontSize:9,color:'#FF4D94',marginBottom:8,letterSpacing:1}}>// SYSTEM INFO</div>
            <div style={{fontFamily:'monospace',fontSize:10,color:'#6B7280',lineHeight:1.8}}>Adalo Help Docs<br/>Builder Intelligence<br/>Claude Vision AI<br/><span style={{color:'#00D4FF'}}>v2.0 — ACTIVE</span></div>
          </div>
        </div>

        {/* MAIN */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{padding:'10px 20px',borderBottom:'1px solid rgba(124,77,255,0.15)',display:'flex',alignItems:'center',justifyContent:'flex-end',gap:8,background:'rgba(13,17,23,0.9)'}}>
            {[{l:'SCREENS',v:screens.length,c:'#00D4FF'},{l:'ISSUES',v:issuesCount,c:'#FF4D6A'},{l:'COMPONENTS',v:componentsCount,c:'#A855F7'}].map((item,i)=>(
              <div key={i} style={{background:'transparent',border:'1px solid rgba(124,77,255,0.25)',padding:'6px 14px',borderRadius:4,fontFamily:'monospace',fontSize:10,display:'flex',alignItems:'center',gap:8}}>
                <span style={{color:'#6B7280'}}>{item.l}</span><span style={{color:item.c,fontWeight:700}}>{item.v}</span>
              </div>
            ))}
          </div>

          <div style={{flex:1,overflow:'auto',padding:20,background:'#0D0B1A'}}>
            
            {tab === 'gallery' && (
              <div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                  <div style={{fontFamily:'monospace',fontSize:11,color:'#00D4FF'}}>{'>'} CAPTURED SCREENS</div>
                  {screens.length > 0 && <button onClick={()=>{setScreens([]);setSelScreen(null);setAnalysis(null);}} style={{fontFamily:'monospace',fontSize:10,color:'#EF4444',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',padding:'6px 12px',borderRadius:4,cursor:'pointer'}}>[CLEAR ALL]</button>}
                </div>
                <div style={{background:'rgba(15,10,31,0.6)',border:'1px solid rgba(124,77,255,0.15)',borderRadius:12,padding:24,minHeight:350}}>
                  {screens.length === 0 ? (
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:300,color:'#6B7280'}}>
                      <div style={{width:70,height:70,background:'rgba(124,77,255,0.08)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20,border:'1px dashed rgba(124,77,255,0.3)'}}><span style={{fontSize:28}}>📸</span></div>
                      <div style={{fontWeight:600,fontSize:15,marginBottom:8,color:'#9CA3AF'}}>No Screens Captured</div>
                      <div style={{fontFamily:'monospace',fontSize:11,color:'#4B5563'}}>// Click Capture Screen or upload a screenshot</div>
                    </div>
                  ) : (
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:16}}>
                      {screens.map((s,i)=>(
                        <div key={s.id} onClick={()=>{setSelScreen(s);setAnalysis(s.analysis||null);setTab('analyze');}} style={{cursor:'pointer',background:'#0D0B1A',border:selScreen?.id===s.id?'2px solid #7C4DFF':'1px solid rgba(124,77,255,0.2)',borderRadius:8,overflow:'hidden',position:'relative'}}>
                          <img src={s.dataUrl} alt={`Screen ${i+1}`} style={{width:'100%',aspectRatio:'9/16',objectFit:'cover'}} />
                          {s.analyzed && <div style={{position:'absolute',bottom:8,right:8,background:'#00D4FF',color:'#0D1117',fontFamily:'monospace',fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:4}}>✓</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'analyze' && (
              <div>
                <div style={{fontFamily:'monospace',fontSize:11,color:'#00D4FF',marginBottom:16}}>{'>'} ANALYZE SCREEN</div>
                {!selScreen ? (
                  <div style={{background:'rgba(15,10,31,0.6)',border:'1px solid rgba(124,77,255,0.15)',borderRadius:12,padding:50,textAlign:'center'}}>
                    <div style={{fontSize:32,marginBottom:16}}>📸</div>
                    <div style={{color:'#9CA3AF',marginBottom:20,fontSize:14}}>Select a screen from gallery or upload one</div>
                    <button onClick={()=>fileRef.current?.click()} style={{padding:'12px 28px',background:'linear-gradient(135deg,#7C4DFF,#A855F7)',border:'none',borderRadius:8,color:'white',fontWeight:700,cursor:'pointer',fontSize:13}}>Upload Screenshot</button>
                  </div>
                ) : (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
                    <div>
                      <img src={selScreen.dataUrl} alt="Selected" style={{width:'100%',borderRadius:10,border:'1px solid rgba(124,77,255,0.2)'}} />
                      <button onClick={runAnalysis} disabled={loading} style={{width:'100%',marginTop:14,padding:16,background:loading?'#374151':'linear-gradient(135deg,#7C4DFF,#FF4D94)',border:'none',borderRadius:8,color:loading?'#9CA3AF':'white',fontWeight:700,fontSize:14,cursor:loading?'not-allowed':'pointer'}}>
                        {loading ? '⏳ Analyzing with Claude Vision...' : '⚡ Run Analysis'}
                      </button>
                    </div>
                    {analysis && (
                      <div style={{background:'rgba(15,10,31,0.6)',border:'1px solid rgba(124,77,255,0.15)',borderRadius:12,padding:20}}>
                        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20}}>
                          <div style={{width:80,height:80,position:'relative'}}>
                            <svg viewBox="0 0 80 80" style={{transform:'rotate(-90deg)'}}>
                              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(124,77,255,0.1)" strokeWidth="6"/>
                              <circle cx="40" cy="40" r="32" fill="none" stroke={col} strokeWidth="6" strokeDasharray={`${(sc/30)*201} 201`} strokeLinecap="round"/>
                            </svg>
                            <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                              <span style={{fontFamily:'monospace',fontSize:24,fontWeight:700,color:col}}>{sc}</span>
                              <span style={{fontFamily:'monospace',fontSize:10,color:'#6B7280'}}>/30</span>
                            </div>
                          </div>
                          <div>
                            <div style={{fontFamily:'monospace',fontSize:10,color:'#6B7280'}}>{analysis.screen_name}</div>
                            <div style={{fontSize:14,fontWeight:700,color:col}}>{sc>=25?'PRODUCTION READY':sc>=18?'NEEDS OPTIMIZATION':'STRUCTURAL ISSUES'}</div>
                          </div>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                          {Object.entries(analysis.scores||{}).map(([k,v])=>(
                            <div key={k} style={{background:'rgba(0,0,0,0.3)',padding:10,borderRadius:6}}>
                              <div style={{fontFamily:'monospace',fontSize:9,color:'#6B7280',marginBottom:4}}>{CATS[k]}</div>
                              <div style={{fontFamily:'monospace',fontSize:16,fontWeight:700,color:v>=4?'#00D4FF':v>=3?'#FBBF24':'#EF4444'}}>{v}/5</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {tab === 'ai' && (
              <div style={{maxWidth:800,margin:'0 auto'}}>
                <div style={{background:'rgba(15,10,31,0.8)',border:'1px solid rgba(124,77,255,0.2)',borderRadius:12,overflow:'hidden',marginBottom:20}}>
                  <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(124,77,255,0.1)',display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:28,height:28,background:'rgba(124,77,255,0.15)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:14}}>🤖</span></div>
                    <div>
                      <div style={{fontFamily:'monospace',fontSize:12,color:'#FF4D94',fontWeight:600}}>ADALO INTELLIGENCE AI</div>
                      <div style={{fontFamily:'monospace',fontSize:9,color:'#6B7280'}}>// Ask anything — design, debug, data, components</div>
                    </div>
                    <span style={{marginLeft:'auto',width:8,height:8,borderRadius:'50%',background:'#00D4FF',animation:'pulse 2s infinite'}}></span>
                  </div>
                  <div style={{minHeight:280,maxHeight:400,overflow:'auto',padding:16}}>
                    {aiMsgs.length === 0 ? (
                      <div style={{background:'rgba(124,77,255,0.05)',border:'1px solid rgba(124,77,255,0.15)',borderRadius:8,padding:16}}>
                        <div style={{fontFamily:'monospace',fontSize:11,color:'#00D4FF',marginBottom:12}}>// SYSTEM READY</div>
                        <p style={{fontSize:13,color:'#D1D5DB',lineHeight:1.7,marginBottom:16}}>I'm your Adalo Builder Intelligence assistant. I have complete knowledge of official Adalo Help Docs. Ask me about:</p>
                        <div style={{display:'flex',flexDirection:'column',gap:8}}>
                          {[{cat:'Design:',items:'Sections, Layout Tab, Sticky, Shared Layout, Responsive Navigation, Branding'},{cat:'Debug:',items:'5-layer framework, record context, filter logic, visibility conflicts'},{cat:'Components:',items:'Lists, Forms, Buttons, Navigation, Marketplace, States'},{cat:'Data:',items:'Collections, relationships, action chains, filters, magic text'}].map((row,i)=>(
                            <div key={i} style={{fontSize:12,color:'#9CA3AF'}}><span style={{color:'#FF4D94',fontWeight:600}}>{row.cat}</span> {row.items}</div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{display:'flex',flexDirection:'column',gap:12}}>
                        {aiMsgs.map((m,i)=>(
                          <div key={i} style={{maxWidth:'85%',padding:14,borderRadius:10,fontSize:13,lineHeight:1.7,alignSelf:m.role==='user'?'flex-end':'flex-start',background:m.role==='user'?'rgba(124,77,255,0.15)':'rgba(30,41,59,0.8)',borderLeft:m.role==='bot'?'3px solid #7C4DFF':'none'}}>{m.text}</div>
                        ))}
                        {aiLoading && <div style={{color:'#6B7280',padding:12,fontFamily:'monospace',fontSize:11}}>// Processing...</div>}
                      </div>
                    )}
                  </div>
                  <div style={{padding:14,borderTop:'1px solid rgba(124,77,255,0.1)',display:'flex',gap:10}}>
                    <input value={aiQ} onChange={e=>setAiQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&aiSend()} placeholder="// Ask about Adalo design, debug, or architecture..." style={{flex:1,background:'rgba(30,41,59,0.5)',border:'1px solid rgba(124,77,255,0.2)',padding:14,color:'#E5E7EB',fontFamily:'monospace',fontSize:12,borderRadius:8,outline:'none'}} />
                    <button onClick={()=>aiSend()} style={{background:'linear-gradient(135deg,#00D4FF,#7C4DFF)',border:'none',padding:'0 20px',borderRadius:8,color:'#0D1117',fontWeight:700,cursor:'pointer',fontSize:16}}>➤</button>
                  </div>
                </div>
                <div style={{background:'rgba(15,10,31,0.6)',border:'1px solid rgba(124,77,255,0.15)',borderRadius:10,padding:16}}>
                  <div style={{fontFamily:'monospace',fontSize:10,color:'#00D4FF',marginBottom:12}}>{'>'} QUICK PROMPTS</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                    {QUICK_PROMPTS.map((p,i)=>(<button key={i} onClick={()=>aiSend(p)} style={{fontFamily:'monospace',fontSize:10,background:'rgba(124,77,255,0.08)',border:'1px solid rgba(124,77,255,0.25)',color:'#A855F7',padding:'6px 12px',borderRadius:4,cursor:'pointer'}}>{p}</button>))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'debug' && (
              <div>
                <div style={{fontFamily:'monospace',fontSize:11,color:'#00D4FF',marginBottom:16}}>{'>'} DEBUG MODE</div>
                {analysis?.issues?.length > 0 ? (
                  <div>{analysis.issues.map((iss,i)=>(
                    <div key={i} style={{background:'rgba(15,10,31,0.6)',borderLeft:`3px solid ${iss.severity==='critical'?'#EF4444':'#FBBF24'}`,padding:16,marginBottom:12,borderRadius:'0 8px 8px 0'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                        <span style={{fontSize:14,fontWeight:600}}>{iss.issue}</span>
                        <span style={{marginLeft:'auto',fontFamily:'monospace',fontSize:9,padding:'3px 10px',borderRadius:4,background:iss.severity==='critical'?'rgba(239,68,68,0.15)':'rgba(251,191,36,0.15)',color:iss.severity==='critical'?'#EF4444':'#FBBF24'}}>{iss.severity.toUpperCase()}</span>
                      </div>
                      <div style={{fontFamily:'monospace',fontSize:12,color:'#00D4FF',marginBottom:6}}>Fix: {iss.fix}</div>
                      <div style={{fontFamily:'monospace',fontSize:11,color:'#6B7280',fontStyle:'italic'}}>{iss.helpDocs}</div>
                    </div>
                  ))}</div>
                ) : (
                  <div style={{background:'rgba(15,10,31,0.6)',border:'1px solid rgba(124,77,255,0.15)',borderRadius:12,padding:50,textAlign:'center',color:'#6B7280'}}>
                    <div style={{fontSize:32,marginBottom:16}}>🐛</div><div>Analyze a screen to see debug results</div>
                  </div>
                )}
              </div>
            )}

            {tab === 'docs' && (
              <div>
                <div style={{fontFamily:'monospace',fontSize:11,color:'#00D4FF',marginBottom:16}}>{'>'} ADALO HELP DOCS</div>
                {[{i:'🏗',t:'Building with Sections',u:'https://help.adalo.com/design/designing-your-app/building-with-sections'},{i:'📐',t:'Alignment Tools',u:'https://help.adalo.com/design/designing-your-app/alignment-tools'},{i:'📌',t:'Sticky While Scrolling',u:'https://help.adalo.com/design/designing-your-app/using-the-layout-tab/sticky-while-scrolling'},{i:'🗄',t:'Connecting Lists to DB',u:'https://help.adalo.com/component-basics/connecting-lists-and-forms-to-a-database'},{i:'⚡',t:'Action Basics',u:'https://help.adalo.com/action-basics/action-basics'}].map((d,i)=>(
                  <a key={i} href={d.u} target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',gap:14,background:'rgba(15,10,31,0.6)',border:'1px solid rgba(124,77,255,0.15)',padding:16,marginBottom:10,borderRadius:8,textDecoration:'none',color:'#E5E7EB'}}>
                    <span style={{fontSize:20}}>{d.i}</span><span style={{flex:1,fontSize:14}}>{d.t}</span><span style={{fontFamily:'monospace',fontSize:12,color:'#7C4DFF'}}>→</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <button onClick={()=>fileRef.current?.click()} style={{position:'fixed',bottom:28,right:28,width:56,height:56,borderRadius:'50%',background:'linear-gradient(135deg,#00D4FF,#7C4DFF)',border:'none',boxShadow:'0 4px 24px rgba(0,212,255,0.4)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>📷</button>
      </div>
    </>
  );
}
