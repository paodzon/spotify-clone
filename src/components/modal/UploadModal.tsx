"use client";
import uniqid from "uniqid";
import { useState } from "react";
import { FieldValues, useForm, SubmitHandler } from "react-hook-form";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

import useUploadModal from "@/hooks/useUploadModal";
import Modal from "../common/Modal";
import Input from "../common/Input";
import Button from "../common/Button";
import { useUser } from "@/hooks/useUser";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

const UploadModal = () => {
  const [isLoading, setLoading] = useState<boolean>(false);
  const uploadModal = useUploadModal();
  const { user } = useUser();
  const supabaseClient = useSupabaseClient();
  const router = useRouter();

  const { register, handleSubmit, reset } = useForm<FieldValues>({
    defaultValues: { author: "", title: "", song: null, image: null },
  });

  const onChange = (open: boolean) => {
    if (!open) {
      reset();
      uploadModal.onClose();
    }
  };

  const onSubmit: SubmitHandler<FieldValues> = async (values) => {
    try {
      setLoading(true);
      const imageFile = values.image?.[0];
      const songFile = values.song?.[0];
      console.log(imageFile);
      if (!imageFile || !songFile || !user) {
        return toast.error("Missing fields");
      }

      const uniqueId = uniqid();

      //Upload song
      const { data: songData, error: songError } = await supabaseClient.storage
        .from("songs")
        .upload(`song-${values.title}-${uniqueId}`, songFile, {
          cacheControl: "3600",
          upsert: false,
        });

        if(songError){
          setLoading(false);
          return toast.error('Failed song upload');
        }

        //Upload image
        const { 
          data: imageData, 
          error: imageError
        } = await supabaseClient
          .storage
          .from('images')
          .upload(`image-${values.title}-${uniqueId}`, imageFile, {
            cacheControl: '3600',
            upsert: false
          });
  
        if (imageError) {
          setLoading(false);
          return toast.error('Failed image upload');
        }

        // Insert record
        const { error: supabaseError } = await supabaseClient
          .from("songs")
          .insert({
            user_id: user.id,
            title: values.title,
            author: values.author,
            image_path: imageData.path,
            song_path: songData.path,
          });

        if(supabaseError){
          setLoading(false)
          return toast.error(supabaseError.message);
        }

        router.refresh();
        setLoading(false);
        toast.success('Song created!');
        reset();
        uploadModal.onClose();
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Add a song"
      description="Upload an mp3 file"
      isOpen={uploadModal.isOpen}
      onChange={onChange}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-y-4">
        <Input
          id="title"
          disabled={isLoading}
          {...register("title", { required: true })}
          placeholder="Song title"
        />
        <Input
          id="author"
          disabled={isLoading}
          {...register("author", { required: true })}
          placeholder="Song author"
        />
        <div>
          <div className="pb-1">Select a song file</div>
          <Input
            id="song"
            type="file"
            disabled={isLoading}
            accept=".mp3"
            {...register("song", { required: true })}
          />
        </div>
        <div>
          <div className="pb-1">Select an image</div>
          <Input
            id="image"
            type="file"
            disabled={isLoading}
            accept="image/*"
            {...register("image", { required: true })}
          />
        </div>
        <Button disabled={isLoading} type="submit">
          {isLoading ? "Creating..." : "Create"}
        </Button>
      </form>
    </Modal>
  );
};

export default UploadModal;
