"use client";
import { useState, useEffect, useRef } from "react";

export default function Home() {
  const stopBulkRef = useRef(false);
  const [url, setUrl] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Uncategorized");
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  
  // Settings state
  const [geminiKey, setGeminiKey] = useState("");
  const [siteName, setSiteName] = useState("");
  const [siteLogo, setSiteLogo] = useState("");
  const [promptCategoryManager, setPromptCategoryManager] = useState("");
  const [promptCategories, setPromptCategories] = useState("");
  const [promptGames, setPromptGames] = useState("");
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState("");
  const [googleAdsenseId, setGoogleAdsenseId] = useState("");
  const [googleVerificationId, setGoogleVerificationId] = useState("");
  const [yandexVerificationId, setYandexVerificationId] = useState("");
  const [bingVerificationId, setBingVerificationId] = useState("");
  
  // Games state
  const [games, setGames] = useState<any[]>([]);
  const [editingGame, setEditingGame] = useState<any>(null);
  const [optimizing, setOptimizing] = useState(false);

  // Categories state
  const [categories, setCategories] = useState<any[]>([]);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    slug: "",
    thumbnail: "",
    seo_title: "",
    seo_description: "",
    seo_keywords: "",
    content_unit: ""
  });
  const [optimizingCategory, setOptimizingCategory] = useState(false);
  const [optimizingCategoryCU, setOptimizingCategoryCU] = useState(false);

  // Sitemap & Robots state
  const [robotsTxt, setRobotsTxt] = useState("");
  const [seoStats, setSeoStats] = useState({ gamesCount: 0, categoriesCount: 0, totalUrls: 0 });
  const [generatingSeo, setGeneratingSeo] = useState(false);
  const [savingRobots, setSavingRobots] = useState(false);

  // SEO Engine runner states
  const [seoActiveTab, setSeoActiveTab] = useState("category_manager");
  const [selectedSeoCategory, setSelectedSeoCategory] = useState("");
  const [selectedSeoGame, setSelectedSeoGame] = useState("");
  const [isRunningSeoCategoryManager, setIsRunningSeoCategoryManager] = useState(false);
  const [isRunningSeoCategoryMeta, setIsRunningSeoCategoryMeta] = useState(false);
  const [isRunningSeoGameMeta, setIsRunningSeoGameMeta] = useState(false);
  const [seoCategoryManagerResult, setSeoCategoryManagerResult] = useState("");
  const [seoCategoryMetaResult, setSeoCategoryMetaResult] = useState<any>(null);
  const [seoGameMetaResult, setSeoGameMetaResult] = useState<any>(null);

  // Selection States
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([]);

  // Category Bulk SEO runner states
  const [isCategoryBulkRunning, setIsCategoryBulkRunning] = useState(false);
  const [categoryBulkType, setCategoryBulkType] = useState<"cu" | "meta" | null>(null);
  const [categoryBulkTotal, setCategoryBulkTotal] = useState(0);
  const [categoryBulkCurrent, setCategoryBulkCurrent] = useState(0);
  const [categoryBulkProgressText, setCategoryBulkProgressText] = useState("");
  const [categoryBulkLog, setCategoryBulkLog] = useState<string[]>([]);
  const [categoryBulkIsStopped, setCategoryBulkIsStopped] = useState(false);
  const [skipOptimizedCategories, setSkipOptimizedCategories] = useState(true);
  const stopCategoryBulkRef = useRef(false);

  // Game Bulk SEO runner states
  const [isGameBulkRunning, setIsGameBulkRunning] = useState(false);
  const [gameBulkTotal, setGameBulkTotal] = useState(0);
  const [gameBulkCurrent, setGameBulkCurrent] = useState(0);
  const [gameBulkProgressText, setGameBulkProgressText] = useState("");
  const [gameBulkLog, setGameBulkLog] = useState<string[]>([]);
  const [gameBulkIsStopped, setGameBulkIsStopped] = useState(false);
  const [skipOptimizedGames, setSkipOptimizedGames] = useState(true);
  const stopGameBulkRef = useRef(false);

  // Scraper status state
  const [scrapeAllStatus, setScrapeAllStatus] = useState<any>({
    status: 'idle',
    currentCategory: 'None',
    processedCategories: 0,
    totalCategories: 0,
    scrapedGamesCount: 0,
    completedCategories: [],
    currentAction: 'No active process'
  });
  const [scrapeAllLogs, setScrapeAllLogs] = useState("");
  const [isScrapingAll, setIsScrapingAll] = useState(false);
  const [useOriginalDescription, setUseOriginalDescription] = useState(false);

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [seoFilter, setSeoFilter] = useState("all");
  const [schemaFilter, setSchemaFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("scraper");

  useEffect(() => {
    fetchSettings();
    fetchGames();
    fetchCategories();
    fetchSeoData();
  }, []);

  useEffect(() => {
    let interval: any;
    
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/scrape-all");
        const data = await res.json();
        if (data.success) {
          setScrapeAllStatus(data.status);
          setScrapeAllLogs(data.logs);
          if (data.status.status === 'running') {
            setIsScrapingAll(true);
          } else {
            setIsScrapingAll(false);
          }
        }
      } catch (e) {}
    };

    checkStatus();
    interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        if (data.settings.gemini_api_key) setGeminiKey(data.settings.gemini_api_key);
        if (data.settings.site_name) setSiteName(data.settings.site_name);
        if (data.settings.site_logo) setSiteLogo(data.settings.site_logo);
        setUseOriginalDescription(data.settings.use_original_description === "true");
        if (data.settings.prompt_category_manager) setPromptCategoryManager(data.settings.prompt_category_manager);
        if (data.settings.prompt_categories) setPromptCategories(data.settings.prompt_categories);
        if (data.settings.prompt_games) setPromptGames(data.settings.prompt_games);
        if (data.settings.google_analytics_id) setGoogleAnalyticsId(data.settings.google_analytics_id);
        if (data.settings.google_adsense_id) setGoogleAdsenseId(data.settings.google_adsense_id);
        if (data.settings.google_verification_id) setGoogleVerificationId(data.settings.google_verification_id);
        if (data.settings.yandex_verification_id) setYandexVerificationId(data.settings.yandex_verification_id);
        if (data.settings.bing_verification_id) setBingVerificationId(data.settings.bing_verification_id);
      }
    } catch (e) {}
  };

  const fetchGames = async () => {
    try {
      const res = await fetch("/api/games");
      const data = await res.json();
      if (data.success && data.games) {
        setGames(data.games);
        if (data.games.length > 0 && !selectedSeoGame) {
          setSelectedSeoGame(data.games[0].id);
        }
      }
    } catch (e) {}
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (data.success && data.categories) {
        setCategories(data.categories);
        // Default select to first category if available
        if (data.categories.length > 0) {
          setSelectedCategory(data.categories[0].name);
          setSelectedSeoCategory(data.categories[0].id);
        }
      }
    } catch (e) {}
  };

  const fetchSeoData = async () => {
    try {
      const res = await fetch("/api/seo-generation");
      const data = await res.json();
      if (data.success) {
        setRobotsTxt(data.robotsTxt);
        setSeoStats(data.stats);
      }
    } catch (e) {}
  };

  const handleSaveRobots = async () => {
    setSavingRobots(true);
    try {
      const res = await fetch("/api/seo-generation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ robotsTxt }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("robots.txt content saved successfully.");
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSavingRobots(false);
    }
  };

  const handleGenerateSeo = async () => {
    setGeneratingSeo(true);
    setMessage("Generating sitemap.xml and robots.txt, syncing to main site...");
    try {
      const res = await fetch("/api/seo-generation", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message);
        fetchSeoData();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setGeneratingSeo(false);
    }
  };

  const saveSettings = async () => {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "gemini_api_key", value: geminiKey }),
      });
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "site_name", value: siteName }),
      });
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "site_logo", value: siteLogo }),
      });
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "use_original_description", value: useOriginalDescription ? "true" : "false" }),
      });
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "google_analytics_id", value: googleAnalyticsId }),
      });
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "google_adsense_id", value: googleAdsenseId }),
      });
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "google_verification_id", value: googleVerificationId }),
      });
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "yandex_verification_id", value: yandexVerificationId }),
      });
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "bing_verification_id", value: bingVerificationId }),
      });
      setMessage("Settings saved successfully.");
    } catch (e) {
      setMessage("Failed to save settings.");
    }
  };

  const handleStartScrapeAll = async (resume: boolean = false) => {
    const confirmMsg = resume 
      ? "Are you sure you want to resume the autonomous scraper? It will skip all completed categories and games."
      : "Are you sure you want to start a fresh autonomous scan? This will reset all completed category tracking.";
    if (!confirm(confirmMsg)) return;
    
    setMessage(resume ? "Resuming autonomous scraper..." : "Starting fresh autonomous scraper...");
    try {
      const res = await fetch("/api/scrape-all", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(resume ? "Autonomous scraper resumed successfully!" : "New autonomous scraper crawl started successfully!");
        setIsScrapingAll(true);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setMessage(`Error starting scraper: ${e.message}`);
    }
  };

  const handleStopScrapeAll = async () => {
    if (!confirm("Are you sure you want to stop the current scraping crawl? You can resume it later.")) return;
    try {
      const res = await fetch("/api/scrape-all", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMessage("Scraper crawl successfully stopped. Progress has been saved.");
        setIsScrapingAll(false);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setMessage(`Error stopping scraper: ${e.message}`);
    }
  };

  const handleResetScrapeAll = async () => {
    if (!confirm("Are you sure you want to hard reset the scraper status to idle? Use this only if the process is stuck or crashed.")) return;
    try {
      const res = await fetch("/api/scrape-all", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMessage("Scraper status successfully reset.");
        setIsScrapingAll(false);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setMessage(`Error resetting scraper: ${e.message}`);
    }
  };

  const handleSavePrompt = async (key: string, value: string) => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Prompt saved successfully.`);
        fetchSettings(); // Refresh settings
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setMessage(`Error saving prompt: ${err.message}`);
    }
  };

  const handleRunCategoryManagerSeo = async () => {
    if (!selectedSeoCategory) {
      setMessage("Please select a category first.");
      return;
    }
    const cat = categories.find(c => c.id === selectedSeoCategory);
    if (!cat) return;
    setIsRunningSeoCategoryManager(true);
    setSeoCategoryManagerResult("");
    try {
      const res = await fetch("/api/optimize-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: cat.name, type: 'category_cu' }),
      });
      const data = await res.json();
      if (data.success && data.content_unit) {
        setSeoCategoryManagerResult(data.content_unit);
        // Automatically save to DB
        const updatedCat = { ...cat, content_unit: data.content_unit };
        const saveRes = await fetch("/api/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedCat),
        });
        if (saveRes.ok) {
          setMessage(`Successfully optimized & updated copywriting unit for category "${cat.name}".`);
          fetchCategories(); // Refresh local list
        } else {
          setMessage(`Generated content, but failed to save to category in DB.`);
        }
      } else {
        setMessage(`Error: ${data.error || 'Failed to generate SEO copywriting unit.'}`);
      }
    } catch (err: any) {
      setMessage(`Error running copywriting optimization: ${err.message}`);
    } finally {
      setIsRunningSeoCategoryManager(false);
    }
  };

  const handleRunCategoryMetaSeo = async () => {
    if (!selectedSeoCategory) {
      setMessage("Please select a category first.");
      return;
    }
    const cat = categories.find(c => c.id === selectedSeoCategory);
    if (!cat) return;
    setIsRunningSeoCategoryMeta(true);
    setSeoCategoryMetaResult(null);
    try {
      const res = await fetch("/api/optimize-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: cat.name, type: 'category' }),
      });
      const data = await res.json();
      if (data.success) {
        setSeoCategoryMetaResult({
          title: data.title,
          description: data.description,
          keywords: data.keywords
        });
        // Automatically save to DB
        const updatedCat = { 
          ...cat, 
          seo_title: data.title, 
          seo_description: data.description, 
          seo_keywords: data.keywords 
        };
        const saveRes = await fetch("/api/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedCat),
        });
        if (saveRes.ok) {
          setMessage(`Successfully optimized & updated Meta SEO for category "${cat.name}".`);
          fetchCategories(); // Refresh local list
        } else {
          setMessage(`Generated Meta SEO, but failed to save to category in DB.`);
        }
      } else {
        setMessage(`Error: ${data.error || 'Failed to generate category Meta SEO.'}`);
      }
    } catch (err: any) {
      setMessage(`Error running category Meta SEO optimization: ${err.message}`);
    } finally {
      setIsRunningSeoCategoryMeta(false);
    }
  };

  const handleRunGameMetaSeo = async () => {
    if (!selectedSeoGame) {
      setMessage("Please select a game first.");
      return;
    }
    const game = games.find(g => g.id === selectedSeoGame);
    if (!game) return;
    setIsRunningSeoGameMeta(true);
    setSeoGameMetaResult(null);
    try {
      const res = await fetch("/api/optimize-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: game.title, description: game.description, type: 'game' }),
      });
      const data = await res.json();
      if (data.success) {
        setSeoGameMetaResult({
          description: data.description,
          keywords: data.keywords
        });
        // Automatically save to DB
        const updatedGame = { 
          ...game, 
          description: data.description, 
          seo_keywords: data.keywords,
          description_source: 'rewritten'
        };
        const saveRes = await fetch("/api/games", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedGame),
        });
        if (saveRes.ok) {
          setMessage(`Successfully optimized & updated Meta SEO for game "${game.title}".`);
          fetchGames(); // Refresh local list
        } else {
          setMessage(`Generated game SEO, but failed to save to game in DB.`);
        }
      } else {
        setMessage(`Error: ${data.error || 'Failed to generate game Meta SEO.'}`);
      }
    } catch (err: any) {
      setMessage(`Error running game Meta SEO optimization: ${err.message}`);
    } finally {
      setIsRunningSeoGameMeta(false);
    }
  };

  const handleRunCategoryBulkSeo = async (type: "cu" | "meta") => {
    let catsToProcess = categories.filter(c => selectedCategoryIds.includes(c.id));
    if (catsToProcess.length === 0) {
      setMessage("Please select at least one category to optimize.");
      return;
    }

    if (skipOptimizedCategories) {
      if (type === "cu") {
        catsToProcess = catsToProcess.filter(c => !(c.content_unit && c.content_unit.length > 50));
      } else {
        catsToProcess = catsToProcess.filter(c => !(c.seo_description && c.seo_description.length > 20));
      }
    }

    if (catsToProcess.length === 0) {
      setMessage("No categories to optimize (selected categories are already optimized or list is empty).");
      return;
    }

    setIsCategoryBulkRunning(true);
    setCategoryBulkType(type);
    setCategoryBulkIsStopped(false);
    setCategoryBulkTotal(catsToProcess.length);
    setCategoryBulkCurrent(0);
    stopCategoryBulkRef.current = false;
    setCategoryBulkProgressText("Initializing category bulk SEO run...");
    setCategoryBulkLog([`[${new Date().toLocaleTimeString()}] Bulk run started for ${catsToProcess.length} categories.`]);
    setMessage("Bulk category SEO optimization started.");

    for (let i = 0; i < catsToProcess.length; i++) {
      if (stopCategoryBulkRef.current) {
        setCategoryBulkIsStopped(true);
        setCategoryBulkLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Paused by user.`]);
        setMessage("Bulk category SEO optimization paused.");
        break;
      }

      const cat = catsToProcess[i];
      setCategoryBulkCurrent(i + 1);
      setCategoryBulkProgressText(`Optimizing [${i + 1}/${catsToProcess.length}]: ${cat.name}...`);
      setCategoryBulkLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Optimizing ${cat.name}...`]);

      try {
        const reqType = type === "cu" ? "category_cu" : "category";
        const res = await fetch("/api/optimize-seo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: cat.name, type: reqType }),
        });
        const data = await res.json();
        if (data.success) {
          let updatedCat: any = { ...cat };
          if (type === "cu") {
            updatedCat.content_unit = data.content_unit;
            if (data.content_unit_fr) updatedCat.content_unit_fr = data.content_unit_fr;
            if (data.content_unit_es) updatedCat.content_unit_es = data.content_unit_es;
          } else {
            updatedCat.seo_title = data.title;
            updatedCat.seo_description = data.description;
            updatedCat.seo_keywords = data.keywords;
            if (data.title_fr) updatedCat.seo_title_fr = data.title_fr;
            if (data.description_fr) updatedCat.seo_description_fr = data.description_fr;
            if (data.keywords_fr) updatedCat.seo_keywords_fr = data.keywords_fr;
            if (data.title_es) updatedCat.seo_title_es = data.title_es;
            if (data.description_es) updatedCat.seo_description_es = data.description_es;
            if (data.keywords_es) updatedCat.seo_keywords_es = data.keywords_es;
          }

          const saveRes = await fetch("/api/categories", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedCat),
          });
          
          if (saveRes.ok) {
            setCategoryBulkLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] SUCCESS - Saved ${cat.name} SEO.`]);
          } else {
            setCategoryBulkLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ERROR - Failed to save ${cat.name} to DB.`]);
          }
        } else {
          setCategoryBulkLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] FAILED - ${data.error || "Unknown error"}`]);
        }
      } catch (err: any) {
        setCategoryBulkLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] EXCEPTION - ${err.message}`]);
      }

      await new Promise(r => setTimeout(r, 2000));
    }

    setIsCategoryBulkRunning(false);
    if (!stopCategoryBulkRef.current) {
      setCategoryBulkProgressText("");
      setCategoryBulkLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Bulk run completed successfully!`]);
      setMessage(`Bulk category SEO optimization completed!`);
      setSelectedCategoryIds([]);
    }
    fetchCategories();
  };

  const handleStopCategoryBulk = () => {
    stopCategoryBulkRef.current = true;
    setCategoryBulkIsStopped(true);
    setMessage("Stopping category bulk run...");
  };

  const handleRunGameBulkSeo = async () => {
    let gamesToProcess = games.filter(g => selectedGameIds.includes(g.id));
    if (gamesToProcess.length === 0) {
      setMessage("Please select at least one game to optimize.");
      return;
    }

    if (skipOptimizedGames) {
      gamesToProcess = gamesToProcess.filter(g => !(g.seo_keywords && g.seo_keywords.length > 20));
    }

    if (gamesToProcess.length === 0) {
      setMessage("No games to optimize (selected games are already optimized or list is empty).");
      return;
    }

    setIsGameBulkRunning(true);
    setGameBulkIsStopped(false);
    setGameBulkTotal(gamesToProcess.length);
    setGameBulkCurrent(0);
    stopGameBulkRef.current = false;
    setGameBulkProgressText("Initializing game bulk SEO run...");
    setGameBulkLog([`[${new Date().toLocaleTimeString()}] Bulk run started for ${gamesToProcess.length} games.`]);
    setMessage("Bulk game SEO optimization started.");

    for (let i = 0; i < gamesToProcess.length; i++) {
      if (stopGameBulkRef.current) {
        setGameBulkIsStopped(true);
        setGameBulkLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Paused by user.`]);
        setMessage("Bulk game SEO optimization paused.");
        break;
      }

      const game = gamesToProcess[i];
      setGameBulkCurrent(i + 1);
      setGameBulkProgressText(`Optimizing [${i + 1}/${gamesToProcess.length}]: ${game.title}...`);
      setGameBulkLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Optimizing ${game.title}...`]);

      try {
        const res = await fetch("/api/optimize-seo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: game.title, description: game.description, type: 'game' }),
        });
        const data = await res.json();
        if (data.success) {
          const updatedGame: any = { 
            ...game, 
            description: data.description, 
            seo_keywords: data.keywords,
            description_source: 'rewritten'
          };
          if (data.description_fr) updatedGame.description_fr = data.description_fr;
          if (data.keywords_fr) updatedGame.seo_keywords_fr = data.keywords_fr;
          if (data.description_es) updatedGame.description_es = data.description_es;
          if (data.keywords_es) updatedGame.seo_keywords_es = data.keywords_es;

          const saveRes = await fetch("/api/games", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedGame),
          });
          
          if (saveRes.ok) {
            setGameBulkLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] SUCCESS - Saved ${game.title} SEO.`]);
          } else {
            setGameBulkLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ERROR - Failed to save ${game.title} to DB.`]);
          }
        } else {
          setGameBulkLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] FAILED - ${data.error || "Unknown error"}`]);
        }
      } catch (err: any) {
        setGameBulkLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] EXCEPTION - ${err.message}`]);
      }

      await new Promise(r => setTimeout(r, 2000));
    }

    setIsGameBulkRunning(false);
    if (!stopGameBulkRef.current) {
      setGameBulkProgressText("");
      setGameBulkLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Bulk run completed successfully!`]);
      setMessage("Bulk game SEO optimization completed!");
      setSelectedGameIds([]);
    }
    fetchGames();
  };

  const handleStopGameBulk = () => {
    stopGameBulkRef.current = true;
    setGameBulkIsStopped(true);
    setMessage("Stopping game bulk run...");
  };

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setMessage("Scraping in progress... this may take 10-20 seconds.");
    
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, category: selectedCategory }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Success: ${data.message}`);
        setUrl("");
        fetchGames(); // Refresh the list
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setMessage("Publishing to main site and committing to Git...");
    
    try {
      const res = await fetch("/api/publish", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Publish Success: ${data.message}`);
      } else {
        setMessage(`Publish Error: ${data.error}`);
      }
    } catch (err: any) {
      setMessage(`Publish Error: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const handleSync13000 = async () => {
    setSyncing(true);
    setMessage("Syncing games and categories data with localhost:13000...");
    try {
      // Ensure we have latest data
      const resGames = await fetch("/api/games");
      const dataGames = await resGames.json();
      const gamesToSync = dataGames.success && dataGames.games ? dataGames.games : games;

      // Sync games
      await fetch("http://localhost:13000/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gamesToSync),
      });

      // Sync categories too
      const resCats = await fetch("/api/categories");
      const dataCats = await resCats.json();
      const catsToSync = dataCats.success && dataCats.categories ? dataCats.categories : categories;

      const res = await fetch("http://localhost:13000/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catsToSync),
      });
      const data = await res.json();

      // Sync settings too
      const resSettings = await fetch("/api/settings");
      const dataSettings = await resSettings.json();
      if (dataSettings.success && dataSettings.settings) {
        await fetch("http://localhost:13000/api/sync?type=settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataSettings.settings),
        });
      }

      if (res.ok && data.success) {
        setMessage("Sync Success: Successfully synced games, categories, and settings data!");
      } else {
        setMessage(`Sync Error: ${data.error || 'Failed to sync categories'}`);
      }
    } catch (err: any) {
      setMessage(`Sync Error: Could not connect to localhost:13000. Make sure the main website is running on port 13000. (${err.message})`);
    } finally {
      setSyncing(false);
    }
  };

  const saveGameEdit = async () => {
    if (!editingGame) return;
    try {
      const res = await fetch("/api/games", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingGame),
      });
      if (res.ok) {
        setMessage("Game updated successfully!");
        setEditingGame(null);
        fetchGames();
      } else {
        setMessage("Failed to update game.");
      }
    } catch (e) {
      setMessage("Error updating game.");
    }
  };

  const optimizeSeo = async () => {
    if (!editingGame) return;
    setOptimizing(true);
    try {
      const res = await fetch("/api/optimize-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editingGame.title, description: editingGame.description }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEditingGame({
          ...editingGame,
          description: data.description,
          seo_keywords: data.keywords
        });
        setMessage("SEO content successfully generated by AI!");
      } else {
        setMessage(`AI Error: ${data.error}`);
      }
    } catch (e) {
      setMessage("Failed to reach AI optimization service.");
    } finally {
      setOptimizing(false);
    }
  };

  // Category specific methods
  const handleCreateCategory = async () => {
    if (!newCategory.name || !newCategory.slug) return;
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory),
      });
      if (res.ok) {
        setMessage("Category created successfully!");
        setIsCreatingCategory(false);
        setNewCategory({
          name: "",
          slug: "",
          thumbnail: "",
          seo_title: "",
          seo_description: "",
          seo_keywords: "",
          content_unit: ""
        });
        fetchCategories();
      } else {
        setMessage("Failed to create category.");
      }
    } catch (e) {
      setMessage("Error creating category.");
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingCategory),
      });
      if (res.ok) {
        setMessage("Category updated successfully!");
        setEditingCategory(null);
        fetchCategories();
      } else {
        setMessage("Failed to update category.");
      }
    } catch (e) {
      setMessage("Error updating category.");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      const res = await fetch(`/api/categories?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessage("Category deleted successfully!");
        fetchCategories();
      } else {
        setMessage("Failed to delete category.");
      }
    } catch (e) {
      setMessage("Error deleting category.");
    }
  };

  const handleCategoryNameChange = (name: string, isEdit: boolean) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (isEdit && editingCategory) {
      setEditingCategory({ ...editingCategory, name, slug });
    } else {
      setNewCategory({ ...newCategory, name, slug });
    }
  };

  const optimizeCategorySeo = async (isEdit: boolean) => {
    const title = isEdit ? editingCategory?.name : newCategory.name;
    if (!title) return;
    setOptimizingCategory(true);
    try {
      const res = await fetch("/api/optimize-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type: 'category' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (isEdit && editingCategory) {
          setEditingCategory({
            ...editingCategory,
            seo_title: data.title,
            seo_description: data.description,
            seo_keywords: data.keywords
          });
        } else {
          setNewCategory({
            ...newCategory,
            seo_title: data.title,
            seo_description: data.description,
            seo_keywords: data.keywords
          });
        }
        setMessage("Category SEO successfully generated by AI!");
      } else {
        setMessage(`AI Error: ${data.error}`);
      }
    } catch (e) {
      setMessage("Failed to reach AI optimization service.");
    } finally {
      setOptimizingCategory(false);
    }
  };

  const optimizeCategoryCU = async (isEdit: boolean) => {
    const title = isEdit ? editingCategory?.name : newCategory.name;
    if (!title) return;
    setOptimizingCategoryCU(true);
    try {
      const res = await fetch("/api/optimize-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type: 'category_cu' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (isEdit && editingCategory) {
          setEditingCategory({
            ...editingCategory,
            content_unit: data.content_unit
          });
        } else {
          setNewCategory({
            ...newCategory,
            content_unit: data.content_unit
          });
        }
        setMessage("Category Content Unit (CU) successfully generated by AI!");
      } else {
        setMessage(`AI Error: ${data.error}`);
      }
    } catch (e) {
      setMessage("Failed to reach AI optimization service.");
    } finally {
      setOptimizingCategoryCU(false);
    }
  };

  const filteredGames = games.filter((game: any) => {
    const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (game.description && game.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || game.category === categoryFilter;
    const isOptimized = game.seo_keywords && game.seo_keywords.length > 20;
    const matchesSeo = seoFilter === "all" || 
                       (seoFilter === "optimized" && isOptimized) || 
                       (seoFilter === "basic" && !isOptimized);
    const hasSchema = game.description && game.description.length > 0 && game.rating !== undefined;
    const matchesSchema = schemaFilter === "all" || 
                         (schemaFilter === "active" && hasSchema) || 
                         (schemaFilter === "inactive" && !hasSchema);

    return matchesSearch && matchesCategory && matchesSeo && matchesSchema;
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8 pb-32">
      <main className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex justify-between items-center border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold">Game Controller CMS</h1>
            <p className="text-gray-500 mt-2">Manage scraping, categories, SEO, and integration for your main website.</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleSync13000}
              disabled={syncing}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition disabled:opacity-50"
            >
              {syncing ? "Syncing..." : "Sync with localhost:13000"}
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition disabled:opacity-50"
            >
              {publishing ? "Publishing..." : "Publish & Commit to Git"}
            </button>
          </div>
        </header>

        {message && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded shadow-sm flex justify-between items-center">
            <span>{message}</span>
            <button onClick={() => setMessage("")} className="font-bold">&times;</button>
          </div>
        )}

        {/* TABS NAVIGATION */}
        <div className="flex border-b border-gray-200 overflow-x-auto whitespace-nowrap bg-white p-2 rounded-xl shadow-sm gap-1 mb-6">
          {[
            { id: "scraper", name: "Game Scraper", icon: "rocket_launch", color: "text-blue-600 border-blue-600 bg-blue-50/50" },
            { id: "categories", name: "Category Manager", icon: "category", color: "text-amber-600 border-amber-600 bg-amber-50/50" },
            { id: "games", name: "Game Manager", icon: "sports_esports", color: "text-emerald-600 border-emerald-600 bg-emerald-50/50" },
            { id: "cms", name: "CMS & SEO Prompts", icon: "auto_stories", color: "text-purple-600 border-purple-600 bg-purple-50/50" },
            { id: "controls", name: "Controls & Sync", icon: "sync_alt", color: "text-indigo-600 border-indigo-600 bg-indigo-50/50" },
            { id: "settings", name: "Website Settings", icon: "settings", color: "text-rose-600 border-rose-600 bg-rose-50/50" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-5 rounded-lg font-semibold text-sm transition-all duration-200 cursor-pointer ${
                  isActive
                    ? `font-bold border-b-2 shadow-sm ${tab.color}`
                    : "text-gray-600 border-transparent hover:text-gray-950 hover:bg-gray-100/60"
                }`}
              >
                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* ACTIVE PANEL CONTENT */}
        <div className="transition-all duration-300">
          {activeTab === "scraper" && (
            <section className="bg-white p-6 rounded-lg shadow space-y-6 animate-fadeIn">
              <div className="border-b pb-4 mb-2">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-blue-600">
                  <span className="material-symbols-outlined">rocket_launch</span>
                  Game Scraper Controls
                </h2>
                <p className="text-sm text-gray-500 mt-1">Scrape individual game URLs or run the autonomous fetch-all pipeline.</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Scrape Single Game */}
                <div className="space-y-4 border-r pr-0 lg:pr-8 border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-800">Scrape Single Game</h3>
                  <form onSubmit={handleScrape} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Game URL (e.g. from Game Monetize)</label>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://gamemonetize.com/sky-gardens-siege"
                        className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Target Category</label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">download</span>
                      {loading ? "Scraping..." : "Start Scraping"}
                    </button>
                  </form>
                </div>

                {/* Autonomous Fetch All */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">Fetch All Games (Autonomous)</h3>
                    <div className="flex gap-2">
                      {isScrapingAll && (
                        <span className="animate-pulse bg-red-100 text-red-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                          ● Running
                        </span>
                      )}
                      {!isScrapingAll && scrapeAllStatus.status === 'stopped' && (
                        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                          ● Stopped
                        </span>
                      )}
                      {!isScrapingAll && scrapeAllStatus.status === 'completed' && (
                        <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                          ● Completed
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    Syncs the HTML5 game catalog from the Game Monetize JSON feed API, automatically maps games to existing categories, translates metadata into English, French, and Spanish, and exports them to the main website.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3">
                    {isScrapingAll ? (
                      <button
                        onClick={handleStopScrapeAll}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded shadow transition flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">block</span>
                        Stop Crawl
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartScrapeAll(false)}
                          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-6 rounded shadow transition flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">rocket_launch</span>
                          Start New Crawl
                        </button>
                        {!isScrapingAll && scrapeAllStatus.status === 'stopped' && (
                          <button
                            onClick={() => handleStartScrapeAll(true)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded shadow transition flex items-center justify-center gap-2 animate-pulse"
                          >
                            <span className="material-symbols-outlined text-sm">play_arrow</span>
                            Resume Crawl
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={handleResetScrapeAll}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2.5 px-4 rounded transition flex items-center justify-center"
                      title="Hard Reset Scraper Status"
                    >
                      <span className="material-symbols-outlined text-sm">restart_alt</span>
                    </button>
                  </div>

                  {/* Progress and status details */}
                  {isScrapingAll || scrapeAllStatus.status !== 'idle' ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between text-sm font-semibold text-gray-700">
                        <span>Category: {scrapeAllStatus.currentCategory}</span>
                        <span>{scrapeAllStatus.processedCategories}/{scrapeAllStatus.totalCategories} ({Math.round((scrapeAllStatus.processedCategories / (scrapeAllStatus.totalCategories || 1)) * 100)}%)</span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${(scrapeAllStatus.processedCategories / (scrapeAllStatus.totalCategories || 1)) * 100}%` }}
                        />
                      </div>

                      <div className="text-xs text-gray-600 space-y-1">
                        <div><span className="font-semibold text-gray-700">Action:</span> {scrapeAllStatus.currentAction}</div>
                        <div><span className="font-semibold text-gray-700">New Games Scraped:</span> {scrapeAllStatus.scrapedGamesCount}</div>
                        {scrapeAllStatus.status === 'completed' && <div className="text-green-600 font-bold">Finished successfully!</div>}
                        {scrapeAllStatus.status === 'failed' && <div className="text-red-600 font-bold">Error: {scrapeAllStatus.error}</div>}
                        {scrapeAllStatus.status === 'stopped' && <div className="text-amber-600 font-bold">Stopped (paused). Click Resume to continue.</div>}
                      </div>

                      {/* Logs terminal box */}
                      <div className="mt-2">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Scraper Logs</label>
                        <pre className="bg-black text-green-400 text-[10px] font-mono p-3 rounded h-32 overflow-y-auto whitespace-pre-wrap select-all">
                          {scrapeAllLogs || "No logs available yet."}
                        </pre>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          )}

          {activeTab === "categories" && (
            <section className="bg-white p-6 rounded-lg shadow space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center border-b pb-4 mb-2">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2 text-amber-600">
                    <span className="material-symbols-outlined">category</span>
                    Categories Manager
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Manage categories, edit SEO metadata and add copywriting units.</p>
                </div>
                <button
                  onClick={() => setIsCreatingCategory(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-lg text-sm transition"
                >
                  + Add Category
                </button>
              </div>

              {/* CATEGORIES BULK ACTIONS BAR */}
              {selectedCategoryIds.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-purple-900">
                      {selectedCategoryIds.length} categories selected
                    </span>
                    <label className="inline-flex items-center text-xs text-purple-700 mt-1 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={skipOptimizedCategories}
                        onChange={(e) => setSkipOptimizedCategories(e.target.checked)}
                        className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 mr-1.5 cursor-pointer"
                      />
                      Skip already optimized categories
                    </label>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleRunCategoryBulkSeo("cu")}
                      disabled={isCategoryBulkRunning}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 px-4 rounded shadow transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-xs">auto_stories</span>
                      Optimize Copywriting (CU)
                    </button>
                    <button
                      onClick={() => handleRunCategoryBulkSeo("meta")}
                      disabled={isCategoryBulkRunning}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded shadow transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-xs">settings_suggest</span>
                      Optimize Meta SEO
                    </button>
                  </div>
                </div>
              )}

              {/* CATEGORY BULK PROGRESS PANEL */}
              {(isCategoryBulkRunning || categoryBulkLog.length > 0) && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
                  <div className="flex justify-between text-sm font-bold text-gray-700">
                    <span>{categoryBulkProgressText || "Bulk Optimization"}</span>
                    {categoryBulkTotal > 0 && (
                      <span>
                        {categoryBulkCurrent}/{categoryBulkTotal} ({Math.round((categoryBulkCurrent / categoryBulkTotal) * 100)}%)
                      </span>
                    )}
                  </div>
                  
                  {categoryBulkTotal > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${(categoryBulkCurrent / categoryBulkTotal) * 100}%` }}
                      />
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-mono">Type: {categoryBulkType === "cu" ? "Copywriting Unit" : "Meta SEO Tags"}</span>
                    {isCategoryBulkRunning ? (
                      <button
                        onClick={handleStopCategoryBulk}
                        className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold px-3 py-1 rounded transition flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">block</span>
                        Stop Optimization
                      </button>
                    ) : (
                      categoryBulkIsStopped && (
                        <span className="text-amber-600 font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">pause</span>
                          Paused
                        </span>
                      )
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Execution Logs</label>
                    <pre className="bg-black text-green-400 text-[10px] font-mono p-3 rounded h-32 overflow-y-auto whitespace-pre-wrap select-all border border-gray-800">
                      {categoryBulkLog.join("\n") || "No logs yet."}
                    </pre>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="p-3 text-center w-12">
                        <input 
                          type="checkbox"
                          checked={categories.length > 0 && selectedCategoryIds.length === categories.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategoryIds(categories.map(c => c.id));
                            } else {
                              setSelectedCategoryIds([]);
                            }
                          }}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="p-3 font-semibold w-20">Thumbnail</th>
                      <th className="p-3 font-semibold">Name</th>
                      <th className="p-3 font-semibold">Slug</th>
                      <th className="p-3 font-semibold">SEO Meta Tags</th>
                      <th className="p-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(cat => (
                      <tr key={cat.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-center">
                          <input 
                            type="checkbox"
                            checked={selectedCategoryIds.includes(cat.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCategoryIds([...selectedCategoryIds, cat.id]);
                              } else {
                                setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== cat.id));
                              }
                            }}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-3">
                          <img src={cat.thumbnail || "/placeholder-cat.png"} alt={cat.name} className="w-16 h-10 object-cover rounded border" />
                        </td>
                        <td className="p-3 font-medium">{cat.name}</td>
                        <td className="p-3 font-mono text-xs">{cat.slug}</td>
                        <td className="p-3">
                          {cat.seo_title && cat.seo_description ? (
                            <span className="text-green-600 text-sm font-medium">✅ Configured</span>
                          ) : (
                            <span className="text-yellow-600 text-sm font-medium">⚠️ Missing Tags</span>
                          )}
                        </td>
                        <td className="p-3 space-x-3 text-sm">
                          <button 
                            onClick={() => setEditingCategory(cat)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === "games" && (
            <section className="bg-white p-6 rounded-lg shadow space-y-6 animate-fadeIn">
              <div className="border-b pb-4 mb-2">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-emerald-600">
                  <span className="material-symbols-outlined">sports_esports</span>
                  Games Management
                </h2>
                <p className="text-sm text-gray-500 mt-1">Search, filter, edit individual game details, and run bulk SEO optimization.</p>
              </div>

              {/* GAMES BULK ACTIONS BAR */}
              {selectedGameIds.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-purple-900">
                      {selectedGameIds.length} games selected
                    </span>
                    <label className="inline-flex items-center text-xs text-purple-700 mt-1 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={skipOptimizedGames}
                        onChange={(e) => setSkipOptimizedGames(e.target.checked)}
                        className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 mr-1.5 cursor-pointer"
                      />
                      Skip already optimized games
                    </label>
                  </div>
                  <button
                    onClick={handleRunGameBulkSeo}
                    disabled={isGameBulkRunning}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 px-4 rounded shadow transition disabled:opacity-50 flex items-center gap-1.5 self-start md:self-auto"
                  >
                    <span className="material-symbols-outlined text-xs">auto_stories</span>
                    Run Game Meta SEO
                  </button>
                </div>
              )}

              {/* GAMES BULK PROGRESS PANEL */}
              {(isGameBulkRunning || gameBulkLog.length > 0) && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
                  <div className="flex justify-between text-sm font-bold text-gray-700">
                    <span>{gameBulkProgressText || "Bulk Game Optimization"}</span>
                    {gameBulkTotal > 0 && (
                      <span>
                        {gameBulkCurrent}/{gameBulkTotal} ({Math.round((gameBulkCurrent / gameBulkTotal) * 100)}%)
                      </span>
                    )}
                  </div>
                  
                  {gameBulkTotal > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${(gameBulkCurrent / gameBulkTotal) * 100}%` }}
                      />
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-mono">Type: Game Meta SEO (Description & Keywords)</span>
                    {isGameBulkRunning ? (
                      <button
                        onClick={handleStopGameBulk}
                        className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold px-3 py-1 rounded transition flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">block</span>
                        Stop Optimization
                      </button>
                    ) : (
                      gameBulkIsStopped && (
                        <span className="text-amber-600 font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">pause</span>
                          Paused
                        </span>
                      )
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Execution Logs</label>
                    <pre className="bg-black text-green-400 text-[10px] font-mono p-3 rounded h-32 overflow-y-auto whitespace-pre-wrap select-all border border-gray-800">
                      {gameBulkLog.join("\n") || "No logs yet."}
                    </pre>
                  </div>
                </div>
              )}

              {/* GAMES FILTERS */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Search Games</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search title/desc..."
                    className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value="all">All Categories</option>
                    {Array.from(new Set(games.map(g => g.category || 'Uncategorized'))).map(catName => (
                      <option key={catName} value={catName}>{catName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">SEO Status</label>
                  <select
                    value={seoFilter}
                    onChange={(e) => setSeoFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value="all">All SEO Statuses</option>
                    <option value="optimized">Optimized Only</option>
                    <option value="basic">Basic Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Schema Status</label>
                  <select
                    value={schemaFilter}
                    onChange={(e) => setSchemaFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value="all">All Schema Statuses</option>
                    <option value="active">Active (VideoGame) Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="p-3 text-center w-12">
                        <input 
                          type="checkbox"
                          checked={filteredGames.length > 0 && filteredGames.every(g => selectedGameIds.includes(g.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const currentIds = filteredGames.map(g => g.id);
                              setSelectedGameIds(Array.from(new Set([...selectedGameIds, ...currentIds])));
                            } else {
                              const currentIds = filteredGames.map(g => g.id);
                              setSelectedGameIds(selectedGameIds.filter(id => !currentIds.includes(id)));
                            }
                          }}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="p-3 font-semibold">Thumbnail</th>
                      <th className="p-3 font-semibold">Title</th>
                      <th className="p-3 font-semibold">Category</th>
                      <th className="p-3 font-semibold">SEO Status</th>
                      <th className="p-3 font-semibold">Schema</th>
                      <th className="p-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGames.map(game => {
                      const hasSchema = game.description && game.description.length > 0 && game.rating !== undefined;
                      return (
                        <tr key={game.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-center">
                            <input 
                              type="checkbox"
                              checked={selectedGameIds.includes(game.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedGameIds([...selectedGameIds, game.id]);
                                } else {
                                  setSelectedGameIds(selectedGameIds.filter(id => id !== game.id));
                                }
                              }}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <img src={game.thumbnail} alt={game.title} className="w-16 h-16 object-cover rounded" />
                          </td>
                          <td className="p-3 font-medium">{game.title}</td>
                          <td className="p-3">
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{game.category}</span>
                          </td>
                          <td className="p-3">
                            {game.seo_keywords && game.seo_keywords.length > 20 ? (
                              <span className="text-green-600 text-sm font-medium">✅ Optimized</span>
                            ) : (
                              <span className="text-yellow-600 text-sm font-medium">⚠️ Basic</span>
                            )}
                          </td>
                          <td className="p-3">
                            {hasSchema ? (
                              <span className="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full font-bold" title="VideoGame schema is dynamically injected in portal pages.">
                                Active (VideoGame)
                              </span>
                            ) : (
                              <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-bold" title="Requires game description and rating to activate VideoGame schema.">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-sm">
                            <button 
                              onClick={() => setEditingGame(game)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredGames.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500 font-medium bg-gray-50">
                          No games found matching your search or filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === "cms" && (
            <section className="bg-white p-6 rounded-lg shadow space-y-6 animate-fadeIn">
              <div className="border-b pb-4 mb-2">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-purple-600">
                  <span className="material-symbols-outlined">auto_stories</span>
                  CMS & SEO Prompts Engine
                </h2>
                <p className="text-sm text-gray-500 mt-1">Configure dynamic AI prompts and run SEO copywriting or meta-tags optimization on individual items.</p>
              </div>

              <div className="flex border-b border-gray-200 overflow-x-auto whitespace-nowrap mb-4">
                <button
                  onClick={() => setSeoActiveTab("category_manager")}
                  className={`py-2 px-4 border-b-2 font-medium text-sm transition-all cursor-pointer ${
                    seoActiveTab === "category_manager"
                      ? "border-purple-600 text-purple-600 font-bold"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Category Copywriting (Manager)
                </button>
                <button
                  onClick={() => setSeoActiveTab("categories")}
                  className={`py-2 px-4 border-b-2 font-medium text-sm transition-all cursor-pointer ${
                    seoActiveTab === "categories"
                      ? "border-purple-600 text-purple-600 font-bold"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Category Meta SEO
                </button>
                <button
                  onClick={() => setSeoActiveTab("games")}
                  className={`py-2 px-4 border-b-2 font-medium text-sm transition-all cursor-pointer ${
                    seoActiveTab === "games"
                      ? "border-purple-600 text-purple-600 font-bold"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Game Meta SEO
                </button>
              </div>

              {seoActiveTab === "category_manager" && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-bold text-gray-700">Category Copywriting Prompt</label>
                      <button
                        onClick={() => handleSavePrompt("prompt_category_manager", promptCategoryManager)}
                        className="bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold py-1.5 px-4 rounded shadow transition"
                      >
                        Save Prompt
                      </button>
                    </div>
                    <textarea
                      value={promptCategoryManager}
                      onChange={(e) => setPromptCategoryManager(e.target.value)}
                      placeholder="System prompt for category copywriting..."
                      rows={8}
                      className="w-full border border-gray-300 rounded p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                    />
                    <span className="text-[10.5px] text-gray-400">Use <code>{`{title}`}</code> as a dynamic placeholder for the Category Name.</span>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Target Category</label>
                      <select
                        value={selectedSeoCategory}
                        onChange={(e) => setSelectedSeoCategory(e.target.value)}
                        className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      >
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.slug})</option>)}
                      </select>
                    </div>
                    <button
                      onClick={handleRunCategoryManagerSeo}
                      disabled={isRunningSeoCategoryManager || categories.length === 0}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded shadow transition disabled:opacity-50 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">auto_stories</span>
                      {isRunningSeoCategoryManager ? "Optimizing..." : "Run Optimization"}
                    </button>
                  </div>

                  {seoCategoryManagerResult && (
                    <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="text-sm font-bold text-gray-700 mb-2">Generation Result Preview (Saved):</h4>
                      <div className="max-h-60 overflow-y-auto border border-gray-300 bg-white p-3 rounded text-xs font-mono text-gray-800 whitespace-pre-wrap">
                        {seoCategoryManagerResult}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {seoActiveTab === "categories" && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-bold text-gray-700">Category Meta SEO Prompt</label>
                      <button
                        onClick={() => handleSavePrompt("prompt_categories", promptCategories)}
                        className="bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold py-1.5 px-4 rounded shadow transition"
                      >
                        Save Prompt
                      </button>
                    </div>
                    <textarea
                      value={promptCategories}
                      onChange={(e) => setPromptCategories(e.target.value)}
                      placeholder="System prompt for category meta tags..."
                      rows={8}
                      className="w-full border border-gray-300 rounded p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                    />
                    <span className="text-[10.5px] text-gray-400">Use <code>{`{title}`}</code> as a dynamic placeholder for the Category Name.</span>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Target Category</label>
                      <select
                        value={selectedSeoCategory}
                        onChange={(e) => setSelectedSeoCategory(e.target.value)}
                        className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      >
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.slug})</option>)}
                      </select>
                    </div>
                    <button
                      onClick={handleRunCategoryMetaSeo}
                      disabled={isRunningSeoCategoryMeta || categories.length === 0}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded shadow transition disabled:opacity-50 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">auto_stories</span>
                      {isRunningSeoCategoryMeta ? "Optimizing..." : "Run Optimization"}
                    </button>
                  </div>

                  {seoCategoryMetaResult && (
                    <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
                      <h4 className="text-sm font-bold text-gray-700 border-b pb-1">Generation Result Preview (Saved):</h4>
                      <div>
                        <span className="block text-xs font-bold text-gray-600 uppercase">SEO Page Title:</span>
                        <div className="bg-white border p-2 rounded text-sm text-gray-800 mt-1">{seoCategoryMetaResult.title}</div>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-gray-600 uppercase">SEO Meta Description:</span>
                        <div className="bg-white border p-2 rounded text-sm text-gray-800 mt-1">{seoCategoryMetaResult.description}</div>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-gray-600 uppercase">SEO Keywords:</span>
                        <div className="bg-white border p-2 rounded text-sm text-gray-800 mt-1 font-mono">{seoCategoryMetaResult.keywords}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {seoActiveTab === "games" && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-bold text-gray-700">Game Meta SEO Prompt</label>
                      <button
                        onClick={() => handleSavePrompt("prompt_games", promptGames)}
                        className="bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold py-1.5 px-4 rounded shadow transition"
                      >
                        Save Prompt
                      </button>
                    </div>
                    <textarea
                      value={promptGames}
                      onChange={(e) => setPromptGames(e.target.value)}
                      placeholder="System prompt for game rewritten description and tags..."
                      rows={8}
                      className="w-full border border-gray-300 rounded p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                    />
                    <span className="text-[10.5px] text-gray-400">Use <code>{`{title}`}</code> and <code>{`{description}`}</code> as dynamic placeholders.</span>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Target Game</label>
                      <select
                        value={selectedSeoGame}
                        onChange={(e) => setSelectedSeoGame(e.target.value)}
                        className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      >
                        {games.map(g => <option key={g.id} value={g.id}>{g.title} ({g.category})</option>)}
                      </select>
                    </div>
                    <button
                      onClick={handleRunGameMetaSeo}
                      disabled={isRunningSeoGameMeta || games.length === 0}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded shadow transition disabled:opacity-50 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">auto_stories</span>
                      {isRunningSeoGameMeta ? "Optimizing..." : "Run Optimization"}
                    </button>
                  </div>

                  {seoGameMetaResult && (
                    <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
                      <h4 className="text-sm font-bold text-gray-700 border-b pb-1">Generation Result Preview (Saved):</h4>
                      <div>
                        <span className="block text-xs font-bold text-gray-600 uppercase">Optimized Game Description:</span>
                        <div className="bg-white border p-2 rounded text-sm text-gray-800 mt-1 whitespace-pre-wrap">{seoGameMetaResult.description}</div>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-gray-600 uppercase">SEO Keywords:</span>
                        <div className="bg-white border p-2 rounded text-sm text-gray-800 mt-1 font-mono">{seoGameMetaResult.keywords}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {activeTab === "controls" && (
            <section className="bg-white p-6 rounded-lg shadow space-y-6 animate-fadeIn">
              <div className="border-b pb-4 flex justify-between items-center mb-2">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2 text-indigo-600">
                    <span className="material-symbols-outlined">sync_alt</span>
                    Controls & Synchronization Tools
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Configure search engine visibility rules, robots.txt, and sitemap generation.</p>
                </div>
                <button
                  onClick={handleGenerateSeo}
                  disabled={generatingSeo}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-6 rounded-lg shadow transition disabled:opacity-50 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">settings_suggest</span>
                  {generatingSeo ? "Generating..." : "Generate & Sync Sitemap"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Robots.txt Editor */}
                <div className="md:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-bold text-gray-800">Robots.txt Rules</label>
                    <button
                      onClick={handleSaveRobots}
                      disabled={savingRobots}
                      className="bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold py-1.5 px-4 rounded shadow transition disabled:opacity-50"
                    >
                      {savingRobots ? "Saving..." : "Save Robots.txt"}
                    </button>
                  </div>
                  <textarea
                    value={robotsTxt}
                    onChange={(e) => setRobotsTxt(e.target.value)}
                    placeholder="User-agent: *..."
                    rows={6}
                    className="w-full border border-gray-300 rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>

                {/* Sitemap Preview / Stats */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm mb-3">Sitemap Statistics</h3>
                    <div className="space-y-2 text-sm text-gray-700">
                      <div className="flex justify-between">
                        <span>Core Pages:</span>
                        <span className="font-semibold">4</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Category Pages:</span>
                        <span className="font-semibold">{seoStats.categoriesCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Game Pages:</span>
                        <span className="font-semibold">{seoStats.gamesCount}</span>
                      </div>
                      <div className="border-t pt-2 mt-2 flex justify-between font-bold text-gray-900 text-base">
                        <span>Total URLs:</span>
                        <span>{seoStats.totalUrls}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-gray-500 bg-white p-2.5 rounded border border-gray-200 font-mono break-all">
                    Sitemap loc: <br />
                    <a 
                      href="http://localhost:13000/sitemap.xml" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      http://localhost:13000/sitemap.xml
                    </a>
                  </div>
                </div>
              </div>

              {/* Sync Actions Quick Access */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mt-4 space-y-4">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Synchronization Dashboard</h3>
                <p className="text-xs text-gray-500">
                  Manually push data from the local SQLite database to the portal JSON file stores. Synchronize live running local instances or push static files to Github repository.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={handleSync13000}
                    disabled={syncing}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">sync</span>
                    {syncing ? "Syncing..." : "Sync Local Portal (Port 13000)"}
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-5 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">cloud_upload</span>
                    {publishing ? "Publishing..." : "Commit & Push Live JSONs"}
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeTab === "settings" && (
            <section className="bg-white p-6 rounded-lg shadow space-y-6 animate-fadeIn">
              <div className="border-b pb-4 mb-2">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-rose-600">
                  <span className="material-symbols-outlined">settings</span>
                  CMS & Website Settings
                </h2>
                <p className="text-sm text-gray-500 mt-1">Configure general branding info, API keys, Google Analytics, AdSense, and search verification tags.</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
                    <input
                      type="text"
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      placeholder="e.g. ULTI GRAVITY"
                      className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Site Logo URL</label>
                    <input
                      type="text"
                      value={siteLogo}
                      onChange={(e) => setSiteLogo(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Google Gemini API Keys (Rotate)</label>
                  <textarea
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy...&#10;AIzaSy..."
                    rows={3}
                    className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Enter one or more keys (one per line) to rotate API access.</p>
                </div>

                {/* Description toggle */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={useOriginalDescription}
                      onChange={(e) => setUseOriginalDescription(e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <span className="block text-sm font-bold text-gray-800">Use Original Game Descriptions (Game Monetize)</span>
                      <span className="block text-xs text-gray-500 mt-0.5">
                        If checked, the original description and instructions from the Game Monetize feed are kept and translated to FR/ES (saving Gemini tokens). If unchecked, Gemini rewrites the description for SEO.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Analytics, Ads & Search Verification Fields */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">analytics</span>
                    Analytics, Ads & Verification IDs
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Google Analytics Measurement ID</label>
                      <input
                        type="text"
                        value={googleAnalyticsId}
                        onChange={(e) => setGoogleAnalyticsId(e.target.value)}
                        placeholder="e.g. G-6WXT4CR2MG"
                        className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm font-mono"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">Google Analytics 4 measurement/tag ID (gtag.js).</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Google AdSense Publisher ID</label>
                      <input
                        type="text"
                        value={googleAdsenseId}
                        onChange={(e) => setGoogleAdsenseId(e.target.value)}
                        placeholder="e.g. ca-pub-XXXXXXXXXXXXXXXX"
                        className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm font-mono"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">Google AdSense publisher ID for auto-ads.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Google Search Console Verification Code</label>
                      <input
                        type="text"
                        value={googleVerificationId}
                        onChange={(e) => setGoogleVerificationId(e.target.value)}
                        placeholder="e.g. google-site-verification content value"
                        className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm font-mono"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">Google site verification token (content attribute value).</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Yandex Verification Code</label>
                      <input
                        type="text"
                        value={yandexVerificationId}
                        onChange={(e) => setYandexVerificationId(e.target.value)}
                        placeholder="e.g. yandex verification code"
                        className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm font-mono"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">Yandex Webmaster verification ID.</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bing Verification Code (msvalidate.01)</label>
                      <input
                        type="text"
                        value={bingVerificationId}
                        onChange={(e) => setBingVerificationId(e.target.value)}
                        placeholder="e.g. msvalidate.01 content value"
                        className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm font-mono"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">Bing Webmaster Tools verification code.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={saveSettings}
                    className="w-full md:w-auto bg-gray-900 hover:bg-black text-white font-medium py-3 px-8 rounded-lg shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">save</span>
                    Save Settings
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>

      </main>

      {/* CREATE CATEGORY MODAL */}
      {isCreatingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
              <h3 className="text-2xl font-bold">Add New Category</h3>
              <button onClick={() => setIsCreatingCategory(false)} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category Name</label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={e => handleCategoryNameChange(e.target.value, false)}
                    placeholder="e.g. Action"
                    className="w-full border rounded p-2 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Slug</label>
                  <input
                    type="text"
                    value={newCategory.slug}
                    onChange={e => setNewCategory({ ...newCategory, slug: e.target.value })}
                    placeholder="e.g. action"
                    className="w-full border rounded p-2 mt-1 font-mono text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Thumbnail Image URL</label>
                <input
                  type="text"
                  value={newCategory.thumbnail}
                  onChange={e => setNewCategory({ ...newCategory, thumbnail: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full border rounded p-2 mt-1 text-sm"
                />
              </div>

              <div className="pt-4 border-t border-gray-200 mt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-gray-800">SEO Page Title</label>
                  <button
                    onClick={() => optimizeCategorySeo(false)}
                    disabled={optimizingCategory}
                    className="bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-300 text-xs font-bold py-1 px-3 rounded shadow-sm disabled:opacity-50"
                  >
                    {optimizingCategory ? "Generating..." : "✨ Auto-write SEO"}
                  </button>
                </div>
                <input
                  type="text"
                  value={newCategory.seo_title}
                  onChange={e => setNewCategory({ ...newCategory, seo_title: e.target.value })}
                  placeholder="Page SEO Title"
                  className="w-full border rounded p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800">SEO Description</label>
                <textarea
                  value={newCategory.seo_description}
                  onChange={e => setNewCategory({ ...newCategory, seo_description: e.target.value })}
                  placeholder="Meta Description tags..."
                  rows={3}
                  className="w-full border rounded p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800">SEO Keywords (comma separated)</label>
                <input
                  type="text"
                  value={newCategory.seo_keywords}
                  onChange={e => setNewCategory({ ...newCategory, seo_keywords: e.target.value })}
                  placeholder="keywords..."
                  className="w-full border rounded p-2 text-sm"
                />
              </div>

              <div className="pt-4 border-t border-gray-200 mt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-gray-800">Copywriting Unit (CU) HTML</label>
                  <button
                    onClick={() => optimizeCategoryCU(false)}
                    disabled={optimizingCategoryCU}
                    className="bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-300 text-xs font-bold py-1 px-3 rounded shadow-sm disabled:opacity-50"
                  >
                    {optimizingCategoryCU ? "Generating..." : "✨ Auto-write CU"}
                  </button>
                </div>
                <textarea
                  value={newCategory.content_unit || ""}
                  onChange={e => setNewCategory({ ...newCategory, content_unit: e.target.value })}
                  placeholder="<h3>Play Free Online Games...</h3><p>Welcome to...</p>"
                  rows={6}
                  className="w-full border rounded p-2 text-sm font-mono text-gray-800"
                />
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
              <button onClick={() => setIsCreatingCategory(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onClick={handleCreateCategory} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow">Create Category</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CATEGORY MODAL */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
              <h3 className="text-2xl font-bold">Edit Category: {editingCategory.name}</h3>
              <button onClick={() => setEditingCategory(null)} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category Name</label>
                  <input
                    type="text"
                    value={editingCategory.name}
                    onChange={e => handleCategoryNameChange(e.target.value, true)}
                    className="w-full border rounded p-2 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Slug</label>
                  <input
                    type="text"
                    value={editingCategory.slug}
                    onChange={e => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                    className="w-full border rounded p-2 mt-1 font-mono text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Thumbnail Image URL</label>
                <input
                  type="text"
                  value={editingCategory.thumbnail}
                  onChange={e => setEditingCategory({ ...editingCategory, thumbnail: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full border rounded p-2 mt-1 text-sm"
                />
              </div>

              <div className="pt-4 border-t border-gray-200 mt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-gray-800">SEO Page Title</label>
                  <button
                    onClick={() => optimizeCategorySeo(true)}
                    disabled={optimizingCategory}
                    className="bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-300 text-xs font-bold py-1 px-3 rounded shadow-sm disabled:opacity-50"
                  >
                    {optimizingCategory ? "Generating..." : "✨ Auto-write SEO"}
                  </button>
                </div>
                <input
                  type="text"
                  value={editingCategory.seo_title}
                  onChange={e => setEditingCategory({ ...editingCategory, seo_title: e.target.value })}
                  className="w-full border rounded p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800">SEO Description</label>
                <textarea
                  value={editingCategory.seo_description}
                  onChange={e => setEditingCategory({ ...editingCategory, seo_description: e.target.value })}
                  rows={3}
                  className="w-full border rounded p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800">SEO Keywords (comma separated)</label>
                <input
                  type="text"
                  value={editingCategory.seo_keywords}
                  onChange={e => setEditingCategory({ ...editingCategory, seo_keywords: e.target.value })}
                  className="w-full border rounded p-2 text-sm"
                />
              </div>

              <div className="pt-4 border-t border-gray-200 mt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-gray-800">Copywriting Unit (CU) HTML</label>
                  <button
                    onClick={() => optimizeCategoryCU(true)}
                    disabled={optimizingCategoryCU}
                    className="bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-300 text-xs font-bold py-1 px-3 rounded shadow-sm disabled:opacity-50"
                  >
                    {optimizingCategoryCU ? "Generating..." : "✨ Auto-write CU"}
                  </button>
                </div>
                <textarea
                  value={editingCategory.content_unit || ""}
                  onChange={e => setEditingCategory({ ...editingCategory, content_unit: e.target.value })}
                  rows={6}
                  className="w-full border rounded p-2 text-sm font-mono text-gray-800"
                />
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
              <button onClick={() => setEditingCategory(null)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onClick={handleUpdateCategory} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* GAME EDIT MODAL */}
      {editingGame && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
              <h3 className="text-2xl font-bold">Edit Game: {editingGame.title}</h3>
              <button onClick={() => setEditingGame(null)} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input type="text" value={editingGame.title} onChange={e => setEditingGame({...editingGame, title: e.target.value})} className="w-full border rounded p-2 mt-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select value={editingGame.category} onChange={e => setEditingGame({...editingGame, category: e.target.value})} className="w-full border rounded p-2 mt-1">
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200 mt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-gray-800">SEO Description</label>
                  <button 
                    onClick={optimizeSeo} 
                    disabled={optimizing}
                    className="bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-300 text-xs font-bold py-1 px-3 rounded shadow-sm disabled:opacity-50"
                  >
                    {optimizing ? "Generating..." : "✨ Rewrite SEO with AI"}
                  </button>
                </div>
                <textarea 
                  value={editingGame.description} 
                  onChange={e => setEditingGame({...editingGame, description: e.target.value})} 
                  className="w-full border rounded p-2 text-sm" 
                  rows={4} 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800">SEO Keywords (comma separated)</label>
                <input 
                  type="text" 
                  value={editingGame.seo_keywords} 
                  onChange={e => setEditingGame({...editingGame, seo_keywords: e.target.value})} 
                  className="w-full border rounded p-2 mt-1 text-sm" 
                />
              </div>
            </div>
            
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
              <button onClick={() => setEditingGame(null)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onClick={saveGameEdit} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow">Save Changes</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
