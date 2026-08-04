export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          badge_type: string
          created_at: string
          id: string
          metadata: Json
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_type: string
          created_at?: string
          id?: string
          metadata?: Json
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_type?: string
          created_at?: string
          id?: string
          metadata?: Json
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      body_weight_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      diet_logs: {
        Row: {
          created_at: string
          date: string
          food_id: string
          id: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          food_id: string
          id?: string
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          food_id?: string
          id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diet_logs_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          day: string
          id: string
          muscle_group: string | null
          name: string
          order_index: number
          scheme: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          muscle_group?: string | null
          name: string
          order_index?: number
          scheme: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          muscle_group?: string | null
          name?: string
          order_index?: number
          scheme?: string
          user_id?: string
        }
        Relationships: []
      }
      foods: {
        Row: {
          calories: number
          carbs_g: number
          category: string
          created_at: string
          fat_g: number
          fiber_g: number
          id: string
          name: string
          protein_g: number
          serving_label: string
        }
        Insert: {
          calories?: number
          carbs_g?: number
          category: string
          created_at?: string
          fat_g?: number
          fiber_g?: number
          id?: string
          name: string
          protein_g?: number
          serving_label: string
        }
        Update: {
          calories?: number
          carbs_g?: number
          category?: string
          created_at?: string
          fat_g?: number
          fiber_g?: number
          id?: string
          name?: string
          protein_g?: number
          serving_label?: string
        }
        Relationships: []
      }
      general_sessions: {
        Row: {
          created_at: string
          date: string
          duration_minutes: number | null
          id: string
          intensity: string | null
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          duration_minutes?: number | null
          id?: string
          intensity?: string | null
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          duration_minutes?: number | null
          id?: string
          intensity?: string | null
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          active: boolean
          created_at: string
          goal_type: string
          goal_weight: number
          id: string
          start_date: string
          start_weight: number
          target_rate: number
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          goal_type: string
          goal_weight: number
          id?: string
          start_date?: string
          start_weight: number
          target_rate: number
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          goal_type?: string
          goal_weight?: number
          id?: string
          start_date?: string
          start_weight?: number
          target_rate?: number
          user_id?: string
        }
        Relationships: []
      }
      gym_buddy_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          planned_days: string[]
          reminder_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          planned_days?: string[]
          reminder_time?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          planned_days?: string[]
          reminder_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_records: {
        Row: {
          created_at: string
          date: string
          exercise_id: string
          id: string
          reps: number
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          date?: string
          exercise_id: string
          id?: string
          reps: number
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string
          date?: string
          exercise_id?: string
          id?: string
          reps?: number
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      pr_history: {
        Row: {
          created_at: string
          date: string
          exercise_id: string
          id: string
          reps: number
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          date?: string
          exercise_id: string
          id?: string
          reps: number
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string
          date?: string
          exercise_id?: string
          id?: string
          reps?: number
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "pr_history_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          exercise_id: string
          id: string
          reps: number | null
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date?: string
          exercise_id: string
          id?: string
          reps?: number | null
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          exercise_id?: string
          id?: string
          reps?: number | null
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
