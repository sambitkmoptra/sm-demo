export interface BlogSection {
  heading: string;
  content: string;
  takeaways: string[];
}

export interface CompetitorDetail {
  name: string;
  details: string;
}

export interface StructuredBlog {
  title: string;
  introduction: string;
  sections: BlogSection[];
  competitors: CompetitorDetail[];
  conclusion: string;
}

export interface LinkedInPost {
  narrative: string;
  visual_prompt: string;
}

export interface FacebookPost {
  narrative: string;
  visual_prompt: string;
}

export interface InstagramSlide {
  slide_text: string;
  visual_prompt: string;
}

export interface ShortsReelsScriptFrame {
  timestamp: string;
  voiceover: string;
  visual_description: string;
}

export interface OmnichannelCampaignBundle {
  blog: StructuredBlog;
  linkedin_post: LinkedInPost;
  facebook_post: FacebookPost;
  pinterest_prompt: string;
  instagram_carousal: InstagramSlide[];
  shorts_reels_script: ShortsReelsScriptFrame[];
}

export interface CampaignLog {
  step: string;
  message: string;
}

export interface CampaignDocument {
  campaign_id: string;
  status: 'QUEUED' | 'RESEARCHING' | 'COPYWRITING' | 'PENDING_REVIEW' | 'FAILED';
  progress: number;
  workflow_options: {
    runResearch: boolean;
    runCopywriter: boolean;
    runVisuals?: boolean;
    runAuditor?: boolean;
    persona_id?: string;
    persona_images?: string[];
  };
  logs: CampaignLog[];
  variants?: OmnichannelCampaignBundle;
  research_summary?: string;
  research_data?: any;
  media_outputs?: {
    linkedin?: string;
    facebook?: string;
    pinterest?: string;
    instagram?: {
      [key: string]: string;
    };
    shorts?: string;
  };
}
